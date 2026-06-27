/**
 * Phase 20 — Authority Graph Engine
 *
 * Builds an in-memory directed graph over all content nodes.
 * Computes authority scores, semantic clusters, crawl depth,
 * link equity, and link validation warnings.
 *
 * Pure compute — no I/O, no side-effects.
 * Called once during build; result passed to linker + reporter.
 */

// ── Node type constants ────────────────────────────────────────────────────
const NODE = {
  TOOL:       'tool',
  ARTICLE:    'article',
  COMPARISON: 'comparison',
  GLOSSARY:   'glossary',
  ENTITY:     'entity',
  COLLECTION: 'collection',
  LANDING:    'landing',
  AUTHOR:     'author',
  INTENT:     'intent',
  PLATFORM:   'platform',
  USE_CASE:   'use-case',
  FEATURE:    'feature',
  FORMAT_FAQ: 'format-faq',
};

// Damping factor for PageRank-style propagation
const DAMPING    = 0.85;
const ITERATIONS = 5;

// ── Graph builder ──────────────────────────────────────────────────────────

export function buildAuthorityGraph(data, freshness) {
  const nodes = new Map(); // id → GraphNode
  const edges = [];        // { from, to, weight }

  // ── Register nodes ───────────────────────────────────────────────────────

  function addNode(id, type, meta) {
    nodes.set(id, {
      id,
      type,
      category:   meta.category || 'general',
      keywords:   meta.keywords  || [],
      mimeTypes:  meta.mimeTypes || [],
      engine:     meta.engine    || null,
      lastUpdated: meta.lastUpdated || '',
      langs:      meta.langs     || ['en'],
      // Computed later
      inLinks:    0,
      outLinks:   0,
      authority:  1.0,
      freshness:  0,
      popularity: 0,
      cluster:    null,
    });
  }

  function addEdge(from, to, weight = 1) {
    if (from === to) return;
    if (!nodes.has(from) || !nodes.has(to)) return;
    edges.push({ from, to, weight });
  }

  // Tools
  for (const t of data.tools) {
    const kw = [
      t.seo?.primaryKeyword || '',
      ...(t.seo?.secondaryKeywords || []),
      t.category,
      ...t.inputFormats,
      ...t.outputFormats.map(f => f.mime),
    ].filter(Boolean);
    addNode(`tool:${t.slug}`, NODE.TOOL, {
      category:  t.category,
      keywords:  kw,
      mimeTypes: [...t.inputFormats, ...t.outputFormats.map(f => f.mime)],
      engine:    t.engine,
      langs:     data.languages.supported || ['en'],
    });
  }

  // Articles
  for (const a of (data.articles || [])) {
    addNode(`article:${a.slug}`, NODE.ARTICLE, {
      category:    a.category,
      keywords:    [a.slug, ...(a.relatedTools || [])],
      lastUpdated: a.lastUpdated || '',
      langs:       data.languages.supported || ['en'],
    });
  }

  // Comparisons
  for (const c of (data.comparisons || [])) {
    addNode(`comparison:${c.slug}`, NODE.COMPARISON, {
      category:    c.category,
      keywords:    [c.subjectA, c.subjectB, ...(c.relatedTools || [])],
      lastUpdated: c.lastUpdated || '',
      langs:       data.languages.supported || ['en'],
    });
  }

  // Glossary
  for (const g of (data.glossary || [])) {
    const term = g.term?.en || g.slug;
    addNode(`glossary:${g.slug}`, NODE.GLOSSARY, {
      category:    g.category,
      keywords:    [term, g.slug, ...(g.relatedTools || []), ...(g.relatedTerms || [])],
      lastUpdated: g.lastUpdated || '',
      langs:       data.languages.supported || ['en'],
    });
  }

  // Entities
  for (const e of (data.entities || [])) {
    addNode(`entity:${e.slug}`, NODE.ENTITY, {
      category:  e.category,
      keywords:  [e.name, e.slug, e.fullName || '', ...e.aliases || [], ...(e.extensions || [])],
      mimeTypes: e.mimeTypes || [],
      langs:     data.languages.supported || ['en'],
    });
  }

  // Collections
  for (const c of (data.collections || [])) {
    addNode(`collection:${c.slug}`, NODE.COLLECTION, {
      category:    c.category,
      keywords:    [c.slug, ...(c.toolSlugs || [])],
      lastUpdated: c.lastUpdated || '',
      langs:       data.languages.supported || ['en'],
    });
  }

  // Landings
  for (const l of (data.landings || [])) {
    addNode(`landing:${l.slug}`, NODE.LANDING, {
      category:  l.category || 'general',
      keywords:  [l.slug, ...(l.toolSlugs || [])],
      langs:     data.languages.supported || ['en'],
    });
  }

  // Authors
  for (const a of (data.authors || [])) {
    addNode(`author:${a.slug}`, NODE.AUTHOR, {
      keywords: [a.name || a.slug],
      langs:    data.languages.supported || ['en'],
    });
  }

  // Intents
  for (const i of (data.intents || [])) {
    for (const m of (i.modifiers || [])) {
      const id = `intent:${i.slug}-${m.slug}`;
      addNode(id, NODE.INTENT, {
        category: 'intent',
        keywords: [i.slug, m.slug, i.toolSlug],
        langs:    data.languages.supported || ['en'],
      });
    }
  }

  // Platforms
  for (const p of (data.platforms || [])) {
    addNode(`platform:${p.slug}`, NODE.PLATFORM, {
      category: p.category || 'general',
      keywords: [p.slug, ...(p.toolSlugs || [])],
      langs:    data.languages.supported || ['en'],
    });
  }

  // Use-cases
  for (const u of (data.useCases || [])) {
    addNode(`use-case:${u.slug}`, NODE.USE_CASE, {
      category: u.category || 'general',
      keywords: [u.slug, ...(u.toolSlugs || [])],
      langs:    data.languages.supported || ['en'],
    });
  }

  // Features
  for (const f of (data.features || [])) {
    addNode(`feature:${f.slug}`, NODE.FEATURE, {
      category: f.slug,
      keywords: [f.slug, f.capability || ''],
      langs:    data.languages.supported || ['en'],
    });
  }

  // ── Register edges ───────────────────────────────────────────────────────

  // Tool → Tool (explicit relatedTools)
  for (const t of data.tools) {
    for (const s of (t.relatedTools || [])) {
      addEdge(`tool:${t.slug}`, `tool:${s}`, 3.0);
    }
  }

  // Article → Tool / Article → Article
  for (const a of (data.articles || [])) {
    for (const s of (a.relatedTools || []))    addEdge(`article:${a.slug}`, `tool:${s}`,    2.0);
    for (const s of (a.relatedArticles || [])) addEdge(`article:${a.slug}`, `article:${s}`, 1.5);
  }

  // Comparison → Tool
  for (const c of (data.comparisons || [])) {
    for (const s of (c.relatedTools || []))    addEdge(`comparison:${c.slug}`, `tool:${s}`,    2.0);
    for (const s of (c.relatedArticles || [])) addEdge(`comparison:${c.slug}`, `article:${s}`, 1.0);
  }

  // Glossary → Tool / Glossary → Article / Glossary → Glossary
  for (const g of (data.glossary || [])) {
    for (const s of (g.relatedTools    || [])) addEdge(`glossary:${g.slug}`, `tool:${s}`,    1.5);
    for (const s of (g.relatedArticles || [])) addEdge(`glossary:${g.slug}`, `article:${s}`, 1.0);
    for (const s of (g.relatedTerms    || [])) addEdge(`glossary:${g.slug}`, `glossary:${s}`, 0.8);
  }

  // Entity → Tool / Entity → Article / Entity → Glossary / Entity → Entity
  for (const e of (data.entities || [])) {
    for (const s of (e.relatedTools    || [])) addEdge(`entity:${e.slug}`, `tool:${s}`,       2.5);
    for (const s of (e.relatedArticles || [])) addEdge(`entity:${e.slug}`, `article:${s}`,    1.5);
    for (const s of (e.relatedGlossary || [])) addEdge(`entity:${e.slug}`, `glossary:${s}`,   1.0);
    for (const s of (e.relatedEntities || [])) addEdge(`entity:${e.slug}`, `entity:${s}`,     1.2);
  }

  // Collection → Tool
  for (const c of (data.collections || [])) {
    for (const s of (c.toolSlugs       || [])) addEdge(`collection:${c.slug}`, `tool:${s}`,       2.0);
    for (const s of (c.relatedGuides   || [])) addEdge(`collection:${c.slug}`, `article:${s}`,    1.0);
    for (const s of (c.relatedComparisons || [])) addEdge(`collection:${c.slug}`, `comparison:${s}`, 1.0);
  }

  // Landing → Tool
  for (const l of (data.landings || [])) {
    for (const s of (l.toolSlugs || [])) addEdge(`landing:${l.slug}`, `tool:${s}`, 1.5);
  }

  // Intent → Tool
  for (const i of (data.intents || [])) {
    for (const m of (i.modifiers || [])) {
      addEdge(`intent:${i.slug}-${m.slug}`, `tool:${i.toolSlug}`, 1.5);
    }
  }

  // Platform → Tool (by toolSlugs)
  for (const p of (data.platforms || [])) {
    for (const s of (p.toolSlugs || [])) addEdge(`platform:${p.slug}`, `tool:${s}`, 1.0);
  }

  // Use-case → Tool
  for (const u of (data.useCases || [])) {
    for (const s of (u.toolSlugs || [])) addEdge(`use-case:${u.slug}`, `tool:${s}`, 1.0);
  }

  // ── Count in/out links ───────────────────────────────────────────────────
  for (const e of edges) {
    const from = nodes.get(e.from);
    const to   = nodes.get(e.to);
    if (from) from.outLinks++;
    if (to)   to.inLinks++;
  }

  // ── PageRank-style authority propagation ─────────────────────────────────
  const n = nodes.size;
  const base = (1 - DAMPING) / n;

  // Build adjacency: to → [{from, weight}]
  const inAdj = new Map();
  for (const node of nodes.keys()) inAdj.set(node, []);
  for (const e of edges) {
    inAdj.get(e.to).push({ from: e.from, weight: e.weight });
  }

  // Outgoing weight totals per node
  const outWeightTotals = new Map();
  for (const node of nodes.keys()) outWeightTotals.set(node, 0);
  for (const e of edges) {
    outWeightTotals.set(e.from, (outWeightTotals.get(e.from) || 0) + e.weight);
  }

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const next = new Map();
    for (const [id] of nodes) {
      const inbound = inAdj.get(id) || [];
      const sum = inbound.reduce((acc, { from, weight }) => {
        const fromNode = nodes.get(from);
        const totalW   = outWeightTotals.get(from) || 1;
        return acc + (fromNode ? fromNode.authority * weight / totalW : 0);
      }, 0);
      next.set(id, base + DAMPING * sum);
    }
    for (const [id, auth] of next) {
      nodes.get(id).authority = auth;
    }
  }

  // Normalise authority to 0–100
  const maxAuth = Math.max(...[...nodes.values()].map(n => n.authority), 1);
  for (const node of nodes.values()) {
    node.authority = Math.round((node.authority / maxAuth) * 100);
  }

  // ── Freshness scores ─────────────────────────────────────────────────────
  const freshnessHashes = freshness?.currentHashes || {};
  const now = Date.now();
  for (const node of nodes.values()) {
    if (!node.lastUpdated) { node.freshness = 50; continue; }
    const ageMs = now - new Date(node.lastUpdated).getTime();
    const ageDays = ageMs / 86400000;
    node.freshness = ageDays < 30  ? 100
                   : ageDays < 90  ? 80
                   : ageDays < 180 ? 60
                   : ageDays < 365 ? 40
                   : 20;
  }

  // ── Popularity proxy: inLinks × weighted by node type ────────────────────
  for (const node of nodes.values()) {
    const typeWeight = { tool: 2, entity: 1.8, article: 1.5, comparison: 1.3,
                        glossary: 1.2, collection: 1.1, landing: 1.0 };
    node.popularity = Math.round(node.inLinks * (typeWeight[node.type] || 1));
  }

  // ── Semantic clusters ────────────────────────────────────────────────────
  const clusters = computeSemanticClusters(nodes, data);

  // ── Crawl depth (BFS from virtual root) ──────────────────────────────────
  const depthMap = computeCrawlDepth(nodes, edges, data);

  // ── Link validation ──────────────────────────────────────────────────────
  const linkWarnings = validateLinkGraph(nodes, edges, data);

  // ── Link equity report ───────────────────────────────────────────────────
  const equity = computeLinkEquity(nodes);

  return { nodes, edges, clusters, depthMap, linkWarnings, equity };
}

// ── Semantic Cluster Builder ───────────────────────────────────────────────

function computeSemanticClusters(nodes, data) {
  // Cluster seeds: named format/capability clusters
  const CLUSTER_SEEDS = {
    png:         ['image/png', 'png'],
    jpg:         ['image/jpeg', 'jpg', 'jpeg'],
    webp:        ['image/webp', 'webp'],
    avif:        ['image/avif', 'avif'],
    svg:         ['image/svg+xml', 'svg'],
    gif:         ['image/gif', 'gif'],
    pdf:         ['application/pdf', 'pdf'],
    json:        ['application/json', 'json'],
    csv:         ['text/csv', 'csv'],
    markdown:    ['text/markdown', 'markdown', 'md'],
    base64:      ['base64', 'data-uri'],
    compression: ['compress', 'compression', 'optimize'],
    metadata:    ['metadata', 'exif'],
    encoding:    ['encoding', 'decode', 'encode'],
    developer:   ['developer', 'json', 'csv', 'base64', 'yaml', 'xml'],
    image:       ['image', 'image_engine'],
    document:    ['document', 'pdf_engine'],
  };

  const clusterMap  = new Map(); // clusterId → Set<nodeId>
  const nodeCluster = new Map(); // nodeId → clusterId

  for (const [clusterId, seeds] of Object.entries(CLUSTER_SEEDS)) {
    clusterMap.set(clusterId, new Set());
  }

  for (const [nodeId, node] of nodes) {
    const text = [
      ...node.keywords,
      ...node.mimeTypes,
      node.engine || '',
      node.category,
    ].join(' ').toLowerCase();

    for (const [clusterId, seeds] of Object.entries(CLUSTER_SEEDS)) {
      if (seeds.some(s => text.includes(s.toLowerCase()))) {
        clusterMap.get(clusterId).add(nodeId);
        // Assign primary cluster if not already assigned (first-win)
        if (!nodeCluster.has(nodeId)) nodeCluster.set(nodeId, clusterId);
      }
    }
  }

  // Assign cluster to node
  for (const [nodeId, clusterId] of nodeCluster) {
    const node = nodes.get(nodeId);
    if (node) node.cluster = clusterId;
  }

  // Build cluster stats
  const clusterStats = {};
  for (const [clusterId, memberSet] of clusterMap) {
    if (memberSet.size === 0) continue;
    const members = [...memberSet].map(id => nodes.get(id)).filter(Boolean);
    const avgAuth = members.reduce((s, n) => s + n.authority, 0) / members.length;
    clusterStats[clusterId] = {
      size:          members.length,
      avg_authority: Math.round(avgAuth),
      types:         [...new Set(members.map(n => n.type))],
    };
  }

  return { nodeCluster, clusterMap, stats: clusterStats };
}

// ── Crawl Depth ────────────────────────────────────────────────────────────

function computeCrawlDepth(nodes, edges, data) {
  // Virtual root → category pages → everything else
  // We use tool:category_slug as depth-1 anchor points, home as depth-0
  const depthMap = new Map(); // nodeId → depth

  // Build adjacency (outgoing)
  const adj = new Map();
  for (const id of nodes.keys()) adj.set(id, []);
  for (const e of edges) adj.get(e.from)?.push(e.to);

  // Seed: home = depth 0, categories = depth 1, entities/guides-index = depth 1
  const seeds = [];
  for (const [id, node] of nodes) {
    if (node.type === NODE.TOOL && data.categories?.some(c => c.id === node.category)) {
      // Category page → depth 1 relative to home
      seeds.push({ id, depth: 1 });
    }
  }

  // BFS
  const queue = [...seeds];
  for (const { id, depth } of seeds) depthMap.set(id, depth);

  let qi = 0;
  while (qi < queue.length) {
    const { id, depth } = queue[qi++];
    for (const neighbor of (adj.get(id) || [])) {
      if (!depthMap.has(neighbor)) {
        depthMap.set(neighbor, depth + 1);
        queue.push({ id: neighbor, depth: depth + 1 });
      }
    }
  }

  // Assign unreached nodes a high depth
  for (const id of nodes.keys()) {
    if (!depthMap.has(id)) depthMap.set(id, 99);
  }

  // Compute distribution
  const depths = [...depthMap.values()].filter(d => d < 99);
  const avgDepth  = depths.length ? (depths.reduce((s, d) => s + d, 0) / depths.length).toFixed(2) : 0;
  const maxDepth  = depths.length ? Math.max(...depths) : 0;
  const deepPages = [...depthMap.entries()]
    .filter(([, d]) => d > 3 && d < 99)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id, depth]) => ({ id, depth }));

  const distribution = {};
  for (const d of depths) {
    distribution[d] = (distribution[d] || 0) + 1;
  }

  return { depthMap, avgDepth: parseFloat(avgDepth), maxDepth, deepPages, distribution };
}

// ── Link Equity Analyzer ───────────────────────────────────────────────────

function computeLinkEquity(nodes) {
  const sorted = [...nodes.values()].sort((a, b) => b.authority - a.authority);

  const topAuthority = sorted.slice(0, 10).map(n => ({
    id:        n.id,
    type:      n.type,
    authority: n.authority,
    inLinks:   n.inLinks,
  }));

  const bottomAuthority = sorted.slice(-10).reverse().map(n => ({
    id:        n.id,
    type:      n.type,
    authority: n.authority,
    inLinks:   n.inLinks,
  }));

  const mostLinked = [...nodes.values()]
    .sort((a, b) => b.inLinks - a.inLinks)
    .slice(0, 10)
    .map(n => ({ id: n.id, type: n.type, inLinks: n.inLinks }));

  const deadEnds = [...nodes.values()]
    .filter(n => n.outLinks === 0 && n.type !== NODE.AUTHOR)
    .map(n => ({ id: n.id, type: n.type }));

  const totalNodes    = nodes.size;
  const totalEdges    = [...nodes.values()].reduce((s, n) => s + n.outLinks, 0);
  const avgAuthority  = Math.round([...nodes.values()].reduce((s, n) => s + n.authority, 0) / totalNodes);
  const avgLinksIn    = (totalEdges / totalNodes).toFixed(1);

  return { topAuthority, bottomAuthority, mostLinked, deadEnds, totalNodes, totalEdges, avgAuthority, avgLinksIn };
}

// ── Link Validation ────────────────────────────────────────────────────────

function validateLinkGraph(nodes, edges, data) {
  const warnings = [];

  // Detect duplicate edges
  const edgeSet = new Set();
  for (const e of edges) {
    const key = `${e.from}→${e.to}`;
    if (edgeSet.has(key)) {
      warnings.push(`AUTHORITY: duplicate edge ${key}`);
    } else {
      edgeSet.add(key);
    }
  }

  // Unused entities (no tool links)
  for (const e of (data.entities || [])) {
    if ((e.relatedTools || []).length === 0) {
      warnings.push(`AUTHORITY: entity "${e.slug}" has no relatedTools — orphaned`);
    }
  }

  // Unused glossary terms (no relatedTools and no relatedArticles)
  for (const g of (data.glossary || [])) {
    if ((g.relatedTools || []).length === 0 && (g.relatedArticles || []).length === 0) {
      warnings.push(`AUTHORITY: glossary "${g.slug}" has no relatedTools or relatedArticles`);
    }
  }

  // Unused collections (no toolSlugs)
  for (const c of (data.collections || [])) {
    if ((c.toolSlugs || []).length === 0) {
      warnings.push(`AUTHORITY: collection "${c.slug}" has no toolSlugs`);
    }
  }

  // Single-link nodes (only one inbound connection — weak authority)
  for (const node of nodes.values()) {
    if (node.inLinks === 1 && node.type !== NODE.AUTHOR && node.type !== NODE.INTENT) {
      warnings.push(`AUTHORITY: weak node "${node.id}" has only 1 inbound link`);
    }
  }

  // Dead-end chains (nodes with no outlinks and < 2 inlinks)
  for (const node of nodes.values()) {
    if (node.outLinks === 0 && node.inLinks < 2 && node.type !== NODE.AUTHOR) {
      warnings.push(`AUTHORITY: dead-end node "${node.id}" (0 out, ${node.inLinks} in)`);
    }
  }

  return warnings;
}

// ── Scoring helpers (exported for linker) ─────────────────────────────────

/**
 * Score two tool nodes against each other using the authority graph.
 * Returns a composite score for candidate ranking.
 */
export function scoreCandidatePair(graph, toolId, candidateId, explicitBonus = 0) {
  const toolNode      = graph.nodes.get(`tool:${toolId}`);
  const candidateNode = graph.nodes.get(`tool:${candidateId}`);
  if (!toolNode || !candidateNode) return 0;

  // Authority of the candidate boosts its score
  const authorityScore = candidateNode.authority * 0.4;

  // Same cluster bonus
  const clusterBonus = (
    toolNode.cluster && candidateNode.cluster &&
    toolNode.cluster === candidateNode.cluster
  ) ? 20 : 0;

  // Same category bonus
  const categoryBonus = toolNode.category === candidateNode.category ? 15 : 0;

  // MIME overlap bonus
  const toolMimes      = new Set(toolNode.mimeTypes);
  const candidateMimes = new Set(candidateNode.mimeTypes);
  const sharedMimes    = [...toolMimes].filter(m => candidateMimes.has(m)).length;
  const mimeBonus      = sharedMimes * 8;

  // Same engine bonus
  const engineBonus = (toolNode.engine && toolNode.engine === candidateNode.engine) ? 10 : 0;

  // Keyword overlap
  const toolKw      = new Set(toolNode.keywords.map(k => k.toLowerCase()));
  const candidateKw = new Set(candidateNode.keywords.map(k => k.toLowerCase()));
  const sharedKw    = [...toolKw].filter(k => candidateKw.has(k) && k.length > 3).length;
  const kwBonus     = sharedKw * 5;

  // Popularity of candidate (inLinks proxy)
  const popularityBonus = Math.min(candidateNode.inLinks * 2, 20);

  return authorityScore + clusterBonus + categoryBonus + mimeBonus +
         engineBonus + kwBonus + popularityBonus + explicitBonus;
}

/**
 * Score a knowledge item (article/comparison/glossary/entity) for relevance to a tool.
 */
export function scoreKnowledgeItem(graph, toolId, itemId, directMatch = false) {
  const toolNode = graph.nodes.get(`tool:${toolId}`);
  const itemNode = graph.nodes.get(itemId);
  if (!toolNode || !itemNode) return directMatch ? 100 : 0;

  const authorityScore  = itemNode.authority * 0.5;
  const directBonus     = directMatch ? 50 : 0;
  const clusterBonus    = (toolNode.cluster && itemNode.cluster && toolNode.cluster === itemNode.cluster) ? 25 : 0;
  const categoryBonus   = toolNode.category === itemNode.category ? 15 : 0;
  const freshnessBonus  = itemNode.freshness * 0.1;
  const popularityBonus = Math.min(itemNode.inLinks * 3, 15);

  return authorityScore + directBonus + clusterBonus + categoryBonus + freshnessBonus + popularityBonus;
}
