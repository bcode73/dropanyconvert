/**
 * Generates per-route SEO data:
 * title, description, canonical, OG, Twitter, schema.org JSON-LD, breadcrumbs, hreflang.
 */

export async function generateSeo(routes, data, config) {
  const seoData = new Map();

  for (const route of routes) {
    const langCode = route.lang;
    const lang = route.language;
    const baseUrl = config.site.baseUrl;
    const globalSeo = data.seoGlobal;

    if (route.type === 'tool') {
      const tool = route.tool;
      const title = (tool.seo.title[langCode] || tool.seo.title.en) + globalSeo.defaults.titleSuffix;
      const description = tool.seo.description[langCode] || tool.seo.description.en;
      const canonical = `${baseUrl}${route.path}`;
      const h1 = tool.seo.h1?.[langCode] || tool.seo.h1?.en || tool.name[langCode] || tool.name.en;

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs.homeName[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: data.categories.find(c => c.id === tool.category)?.name[langCode] || tool.category, url: `${baseUrl}/${langCode}/${data.categories.find(c => c.id === tool.category)?.slug}` },
        { name: tool.name[langCode] || tool.name.en, url: canonical },
      ];

      const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: tool.faq.map(item => ({
          '@type': 'Question',
          name: item.question[langCode] || item.question.en,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer[langCode] || item.answer.en,
          },
        })),
      };

      const appSchema = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: tool.name[langCode] || tool.name.en,
        description: description,
        applicationCategory: globalSeo.defaults.applicationCategory,
        operatingSystem: globalSeo.defaults.operatingSystem,
        offers: {
          '@type': 'Offer',
          price: globalSeo.defaults.offers.price,
          priceCurrency: globalSeo.defaults.offers.priceCurrency,
        },
        url: canonical,
      };

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: crumb.name,
          item: crumb.url,
        })),
      };

      const webPageSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description,
        url: canonical,
        breadcrumb: { '@id': canonical + '#breadcrumb' },
        isPartOf: { '@type': 'WebSite', name: globalSeo.defaults.ogSiteName, url: baseUrl },
        inLanguage: langCode,
      };

      seoData.set(route.path, {
        title,
        description,
        canonical,
        h1,
        robots: globalSeo.defaults.robots,
        ogTitle: title,
        ogDescription: description,
        ogUrl: canonical,
        ogType: globalSeo.defaults.ogType,
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary_large_image',
        twitterSite: globalSeo.seo?.twitterHandle || '',
        twitterTitle: title,
        twitterDescription: description,
        hreflang: route.hreflang || [],
        hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs,
        schemas: [webPageSchema, appSchema, faqSchema, breadcrumbSchema],
        primaryKeyword: tool.seo.primaryKeyword,
        secondaryKeywords: tool.seo.secondaryKeywords || [],
      });
    } else if (route.type === 'category') {
      const category = route.category;
      const name = category.name[langCode] || category.name.en;
      const desc = category.description[langCode] || category.description.en;
      const title = `${name}${globalSeo.defaults.titleSuffix}`;
      const canonical = `${baseUrl}${route.path}`;

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs.homeName[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name, url: canonical },
      ];

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: crumb.name,
          item: crumb.url,
        })),
      };

      const itemListSchema = route.tools && route.tools.length > 0 ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name,
        description: desc,
        url: canonical,
        numberOfItems: route.tools.length,
        itemListElement: route.tools.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: t.name[langCode] || t.name.en,
          url: `${baseUrl}/${langCode}/${t.slug}`,
        })),
      } : null;

      seoData.set(route.path, {
        title,
        description: desc,
        canonical,
        h1: name,
        robots: globalSeo.defaults.robots,
        ogTitle: title,
        ogDescription: desc,
        ogUrl: canonical,
        ogType: globalSeo.defaults.ogType,
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary_large_image',
        twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [],
        hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs,
        schemas: [breadcrumbSchema, ...(itemListSchema ? [itemListSchema] : [])],
      });
    } else if (route.type === 'legal') {
      const legalPage = route.legal;
      const pageTitle = legalPage.titles[langCode] || legalPage.titles.en;
      const title = `${pageTitle} — ${config.site.name}`;
      const canonical = `${baseUrl}${route.path}`;

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs?.homeName?.[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: pageTitle, url: canonical },
      ];

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: crumb.name,
          item: crumb.url,
        })),
      };

      seoData.set(route.path, {
        title,
        description: legalPage.description,
        canonical,
        h1: pageTitle,
        robots: 'index, follow',
        ogTitle: title,
        ogDescription: legalPage.description,
        ogUrl: canonical,
        ogType: 'website',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary',
        twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [],
        hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs,
        schemas: [breadcrumbSchema],
        lastUpdated: legalPage.lastUpdated,
      });
    } else if (route.type === 'article') {
      const article = route.article;
      const langCode = route.lang;
      const title = (article.title?.[langCode] || article.title?.en || article.h1?.en) + globalSeo.defaults.titleSuffix;
      const description = article.description?.[langCode] || article.description?.en || '';
      const h1 = article.h1?.[langCode] || article.h1?.en || '';
      const canonical = `${baseUrl}${route.path}`;
      const catObj = data.categories.find(c => c.id === article.category);

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs?.homeName?.[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: langCode === 'en' ? 'Guides' : 'Guides', url: `${baseUrl}/${langCode}/guides` },
        { name: h1, url: canonical },
      ];

      const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: h1,
        description,
        url: canonical,
        datePublished: article.publishedDate || article.lastUpdated || '',
        dateModified: article.lastUpdated || '',
        author: {
          '@type': 'Organization',
          name: article.reviewedBy || 'Editorial Team',
          url: baseUrl,
        },
        publisher: {
          '@type': 'Organization',
          name: globalSeo.defaults?.ogSiteName || config.site.name,
          url: baseUrl,
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        inLanguage: langCode,
      };

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      };

      const faqSchema = article.faq?.length ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: article.faq.map(item => ({
          '@type': 'Question',
          name: item.question?.[langCode] || item.question?.en || '',
          acceptedAnswer: { '@type': 'Answer', text: item.answer?.[langCode] || item.answer?.en || '' },
        })),
      } : null;

      seoData.set(route.path, {
        title,
        description,
        canonical,
        h1,
        robots: globalSeo.defaults.robots,
        ogTitle: title,
        ogDescription: description,
        ogUrl: canonical,
        ogType: 'article',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary_large_image',
        twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [],
        hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs,
        schemas: [articleSchema, breadcrumbSchema, ...(faqSchema ? [faqSchema] : [])],
        lastUpdated: article.lastUpdated,
      });
    } else if (route.type === 'comparison') {
      const cmp = route.comparison;
      const langCode = route.lang;
      const title = (cmp.title?.[langCode] || cmp.title?.en) + globalSeo.defaults.titleSuffix;
      const description = cmp.description?.[langCode] || cmp.description?.en || '';
      const h1 = cmp.h1?.[langCode] || cmp.h1?.en || '';
      const canonical = `${baseUrl}${route.path}`;

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs?.homeName?.[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: 'Compare', url: `${baseUrl}/${langCode}/compare` },
        { name: `${cmp.subjectA} vs ${cmp.subjectB}`, url: canonical },
      ];

      const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: h1,
        description,
        url: canonical,
        dateModified: cmp.lastUpdated || '',
        publisher: {
          '@type': 'Organization',
          name: globalSeo.defaults?.ogSiteName || config.site.name,
          url: baseUrl,
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      };

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      };

      const faqSchema = cmp.faq?.length ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: cmp.faq.map(item => ({
          '@type': 'Question',
          name: item.question?.[langCode] || item.question?.en || '',
          acceptedAnswer: { '@type': 'Answer', text: item.answer?.[langCode] || item.answer?.en || '' },
        })),
      } : null;

      seoData.set(route.path, {
        title,
        description,
        canonical,
        h1,
        robots: globalSeo.defaults.robots,
        ogTitle: title,
        ogDescription: description,
        ogUrl: canonical,
        ogType: 'article',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary_large_image',
        twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [],
        hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs,
        schemas: [articleSchema, breadcrumbSchema, ...(faqSchema ? [faqSchema] : [])],
        lastUpdated: cmp.lastUpdated,
      });
    } else if (route.type === 'glossary') {
      const term = route.term;
      const langCode = route.lang;
      const termName = term.term?.[langCode] || term.term?.en || '';
      const title = `${termName} — Definition & Guide` + globalSeo.defaults.titleSuffix;
      const description = term.shortDef?.[langCode] || term.shortDef?.en || '';
      const canonical = `${baseUrl}${route.path}`;

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs?.homeName?.[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: 'Glossary', url: `${baseUrl}/${langCode}/glossary` },
        { name: termName, url: canonical },
      ];

      const definedTermSchema = {
        '@context': 'https://schema.org',
        '@type': 'DefinedTerm',
        name: termName,
        description: term.definition?.[langCode] || term.definition?.en || '',
        inDefinedTermSet: `${baseUrl}/${langCode}/glossary`,
        url: canonical,
      };

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      };

      seoData.set(route.path, {
        title,
        description,
        canonical,
        h1: termName,
        robots: globalSeo.defaults.robots,
        ogTitle: title,
        ogDescription: description,
        ogUrl: canonical,
        ogType: 'article',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary',
        twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [],
        hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs,
        schemas: [definedTermSchema, breadcrumbSchema],
        lastUpdated: term.lastUpdated,
      });
    } else if (route.type === 'guides-index' || route.type === 'compare-index' || route.type === 'glossary-index') {
      const langCode = route.lang;
      const labels = {
        'guides-index': { name: 'Guides', desc: 'In-depth guides to image, PDF, and developer file formats.' },
        'compare-index': { name: 'Format Comparisons', desc: 'Side-by-side comparisons of image and data formats.' },
        'glossary-index': { name: 'Glossary', desc: 'Definitions of image, PDF, and developer format terminology.' },
      };
      const { name, desc } = labels[route.type];
      const title = `${name}` + globalSeo.defaults.titleSuffix;
      const canonical = `${baseUrl}${route.path}`;

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs?.homeName?.[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name, url: canonical },
      ];

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      };

      seoData.set(route.path, {
        title,
        description: desc,
        canonical,
        h1: name,
        robots: globalSeo.defaults.robots,
        ogTitle: title,
        ogDescription: desc,
        ogUrl: canonical,
        ogType: 'website',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary',
        twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [],
        hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs,
        schemas: [breadcrumbSchema],
      });
    } else if (route.type === 'collection') {
      const coll = route.collection;
      const langCode = route.lang;
      const title = (coll.seo?.title?.[langCode] || coll.seo?.title?.en || coll.title?.[langCode] || coll.title?.en || '') + globalSeo.defaults.titleSuffix;
      const description = coll.seo?.description?.[langCode] || coll.seo?.description?.en || coll.description?.[langCode] || coll.description?.en || '';
      const h1 = coll.h1?.[langCode] || coll.h1?.en || coll.title?.[langCode] || coll.title?.en || '';
      const canonical = `${baseUrl}${route.path}`;

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs?.homeName?.[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: langCode === 'en' ? 'Collections' : 'Collections', url: `${baseUrl}/${langCode}/collections` },
        { name: h1, url: canonical },
      ];

      const collectionSchema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: h1,
        description,
        url: canonical,
        publisher: { '@type': 'Organization', name: globalSeo.defaults?.ogSiteName || config.site.name, url: baseUrl },
      };

      const itemListSchema = route.tools && route.tools.length > 0 ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: h1,
        numberOfItems: route.tools.length,
        itemListElement: route.tools.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: t.name[langCode] || t.name.en,
          url: `${baseUrl}/${langCode}/${t.slug}`,
        })),
      } : null;

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      };

      seoData.set(route.path, {
        title,
        description,
        canonical,
        h1,
        robots: globalSeo.defaults.robots,
        ogTitle: title,
        ogDescription: description,
        ogUrl: canonical,
        ogType: 'website',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary_large_image',
        twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [],
        hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs,
        schemas: [collectionSchema, ...(itemListSchema ? [itemListSchema] : []), breadcrumbSchema],
        primaryKeyword: coll.seo?.primaryKeyword || '',
      });
    } else if (route.type === 'collections-index') {
      const langCode = route.lang;
      const title = `Tool Collections${globalSeo.defaults.titleSuffix}`;
      const description = 'Curated collections of the best free online tools for images, PDFs, and web development.';
      const canonical = `${baseUrl}${route.path}`;

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs?.homeName?.[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: 'Collections', url: canonical },
      ];

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      };

      seoData.set(route.path, {
        title,
        description,
        canonical,
        h1: 'Tool Collections',
        robots: globalSeo.defaults.robots,
        ogTitle: title,
        ogDescription: description,
        ogUrl: canonical,
        ogType: 'website',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary',
        twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [],
        hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs,
        schemas: [breadcrumbSchema],
      });
    } else if (route.type === 'landing') {
      const landing = route.landing;
      const langCode = route.lang;
      const title = (landing.seo?.title?.[langCode] || landing.seo?.title?.en || landing.title?.[langCode] || landing.title?.en || '') + globalSeo.defaults.titleSuffix;
      const description = landing.seo?.description?.[langCode] || landing.seo?.description?.en || landing.description?.[langCode] || landing.description?.en || '';
      const h1 = landing.h1?.[langCode] || landing.h1?.en || landing.title?.[langCode] || landing.title?.en || '';
      const canonical = `${baseUrl}${route.path}`;

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs?.homeName?.[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: h1, url: canonical },
      ];

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      };

      const faqSchema = landing.faq?.length ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: landing.faq.map(item => ({
          '@type': 'Question',
          name: item.question?.[langCode] || item.question?.en || '',
          acceptedAnswer: { '@type': 'Answer', text: item.answer?.[langCode] || item.answer?.en || '' },
        })),
      } : null;

      const itemListSchema = route.tools && route.tools.length > 0 ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: h1,
        numberOfItems: route.tools.length,
        itemListElement: route.tools.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: t.name[langCode] || t.name.en,
          url: `${baseUrl}/${langCode}/${t.slug}`,
        })),
      } : null;

      seoData.set(route.path, {
        title,
        description,
        canonical,
        h1,
        robots: globalSeo.defaults.robots,
        ogTitle: title,
        ogDescription: description,
        ogUrl: canonical,
        ogType: 'website',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary_large_image',
        twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [],
        hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs,
        schemas: [breadcrumbSchema, ...(itemListSchema ? [itemListSchema] : []), ...(faqSchema ? [faqSchema] : [])],
        primaryKeyword: landing.seo?.primaryKeyword || landing.targetKeyword || '',
      });
    } else if (route.type === 'faq-hub') {
      const langCode = route.lang;
      const title = `Frequently Asked Questions${globalSeo.defaults.titleSuffix}`;
      const description = 'Answers to the most common questions about image formats, PDF tools, and developer utilities on DropAnyConvert.';
      const canonical = `${baseUrl}${route.path}`;

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs?.homeName?.[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: 'FAQ', url: canonical },
      ];

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      };

      seoData.set(route.path, {
        title,
        description,
        canonical,
        h1: 'Frequently Asked Questions',
        robots: globalSeo.defaults.robots,
        ogTitle: title,
        ogDescription: description,
        ogUrl: canonical,
        ogType: 'website',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary',
        twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [],
        hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs,
        schemas: [breadcrumbSchema],
      });
    } else if (route.type === 'trust') {
      const trust = route.trust;
      const langCode = route.lang;
      const h1 = trust.h1?.[langCode] || trust.h1?.en || 'Trust & Security Center';
      const description = trust.description?.[langCode] || trust.description?.en;
      const canonical = `${baseUrl}${route.path}`;
      const title = `${h1}${globalSeo.defaults.titleSuffix}`;

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs?.homeName?.[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: h1, url: canonical },
      ];

      const orgData = trust.organization || {};
      const organizationSchema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: orgData.name || config.site.name,
        url: orgData.url || baseUrl,
        logo: `${baseUrl}/assets/images/icon-512.png`,
        description: orgData.description || config.site.tagline,
        foundingDate: orgData.foundingYear,
        areaServed: orgData.areaServed || 'Worldwide',
        knowsAbout: orgData.knowsAbout || [],
        sameAs: [],
      };

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      };

      seoData.set(route.path, {
        title, description, canonical, h1,
        robots: globalSeo.defaults.robots,
        ogTitle: title, ogDescription: description, ogUrl: canonical, ogType: 'website',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary', twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [], hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs, schemas: [organizationSchema, breadcrumbSchema],
      });
    } else if (route.type === 'editorial') {
      const page = route.editorialPage;
      const langCode = route.lang;
      const h1 = page.h1?.[langCode] || page.h1?.en;
      const title = `${page.title?.[langCode] || page.title?.en}${globalSeo.defaults.titleSuffix}`;
      const description = page.description?.[langCode] || page.description?.en;
      const canonical = `${baseUrl}${route.path}`;

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs?.homeName?.[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: 'Editorial', url: `${baseUrl}/${langCode}/editorial/editorial-process` },
        { name: h1, url: canonical },
      ];

      const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: h1,
        description,
        url: canonical,
        dateModified: page.lastUpdated,
        publisher: { '@type': 'Organization', name: config.site.name, url: baseUrl },
      };

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      };

      seoData.set(route.path, {
        title, description, canonical, h1,
        robots: globalSeo.defaults.robots,
        ogTitle: title, ogDescription: description, ogUrl: canonical, ogType: 'article',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary', twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [], hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs, schemas: [articleSchema, breadcrumbSchema],
      });
    } else if (route.type === 'changelog') {
      const langCode = route.lang;
      const h1 = 'Changelog';
      const title = `Changelog${globalSeo.defaults.titleSuffix}`;
      const description = 'Version history, new features, and improvements for DropAnyConvert.';
      const canonical = `${baseUrl}${route.path}`;

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs?.homeName?.[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: 'Changelog', url: canonical },
      ];

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      };

      seoData.set(route.path, {
        title, description, canonical, h1,
        robots: globalSeo.defaults.robots,
        ogTitle: title, ogDescription: description, ogUrl: canonical, ogType: 'website',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary', twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [], hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs, schemas: [breadcrumbSchema],
      });
    } else if (route.type === 'entity') {
      const entity = route.entity;
      const title  = `${entity.name} Format — ${entity.fullName || entity.name} Guide` + globalSeo.defaults.titleSuffix;
      const description = entity.description
        ? entity.description.slice(0, 160)
        : `Learn about the ${entity.name} format: history, technical details, browser support, advantages, and tools.`;
      const canonical = `${baseUrl}${route.path}`;
      const h1 = `What is ${entity.name}? — ${entity.fullName || entity.name} Complete Guide`;

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs?.homeName?.[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: 'File Formats', url: `${baseUrl}/${langCode}/entity` },
        { name: entity.name, url: canonical },
      ];

      const definedTermSchema = {
        '@context': 'https://schema.org',
        '@type': 'DefinedTerm',
        name: entity.fullName || entity.name,
        alternateName: entity.name,
        description: entity.description || '',
        url: canonical,
        inDefinedTermSet: `${baseUrl}/${langCode}/entity`,
      };

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      };

      const faqSchema = entity.faq?.length ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: entity.faq.map(f => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      } : null;

      seoData.set(route.path, {
        title, description, canonical, h1,
        robots: globalSeo.defaults.robots,
        ogTitle: title, ogDescription: description, ogUrl: canonical, ogType: 'article',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary_large_image', twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [], hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs,
        schemas: [definedTermSchema, breadcrumbSchema, ...(faqSchema ? [faqSchema] : [])],
      });
    } else if (route.type === 'entity-index') {
      const canonical = `${baseUrl}${route.path}`;
      const title     = `File Format Reference — Complete Format Guide` + globalSeo.defaults.titleSuffix;
      const description = 'Complete reference for image, PDF, and developer file formats. Learn about PNG, JPG, WebP, PDF, JSON, YAML, XML, CSV, Base64, and more.';
      const h1 = 'File Format Reference';

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs?.homeName?.[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: 'File Formats', url: canonical },
      ];

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      };

      seoData.set(route.path, {
        title, description, canonical, h1,
        robots: globalSeo.defaults.robots,
        ogTitle: title, ogDescription: description, ogUrl: canonical, ogType: 'website',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary_large_image', twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [], hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs, schemas: [breadcrumbSchema],
      });
    } else if (route.type === 'author') {
      const author = route.author;
      const title  = `${author.name} — ${author.role}` + globalSeo.defaults.titleSuffix;
      const description = author.bio ? author.bio.slice(0, 160) : `${author.name} — ${author.role} at DropAnyConvert.`;
      const canonical = `${baseUrl}${route.path}`;
      const h1 = author.name;

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs?.homeName?.[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: author.name, url: canonical },
      ];

      const personSchema = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: author.name,
        description: author.bio || '',
        url: canonical,
        worksFor: { '@type': 'Organization', name: config.site.name, url: baseUrl },
        knowsAbout: author.specialties || [],
      };

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      };

      seoData.set(route.path, {
        title, description, canonical, h1,
        robots: globalSeo.defaults.robots,
        ogTitle: title, ogDescription: description, ogUrl: canonical, ogType: 'profile',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary', twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [], hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs, schemas: [personSchema, breadcrumbSchema],
      });
    } else if (route.type === 'home') {
      const canonical = `${baseUrl}${route.path}`;
      const homeDesc = globalSeo.homeDescription?.[langCode] || globalSeo.homeDescription?.en || config.site.tagline;
      const homeTitle = `${config.site.name} — ${config.site.tagline}`;

      const organizationSchema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: config.site.name,
        url: baseUrl,
        logo: `${baseUrl}/assets/images/icon-512.png`,
        sameAs: [],
      };

      const webSiteSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: config.site.name,
        url: baseUrl,
        description: config.site.tagline,
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${baseUrl}/${langCode}/search?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      };

      seoData.set(route.path, {
        title: homeTitle,
        description: homeDesc,
        canonical,
        robots: globalSeo.defaults.robots,
        ogTitle: homeTitle,
        ogDescription: homeDesc,
        ogUrl: canonical,
        ogType: 'website',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary_large_image',
        twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [],
        hreflangDefault: route.hreflangDefault || canonical,
        schemas: [organizationSchema, webSiteSchema],
      });

    // ── Phase 17 route types ──────────────────────────────────────────────

    } else if (route.type === 'intent') {
      const { intent, modifier, tool } = route;
      const canonical = `${baseUrl}${route.path}`;
      const modLabel   = modifier.label?.en || '';
      const baseTitle  = intent.baseTitle?.en || '';
      const h1         = `${baseTitle} ${modLabel}`.trim();
      const title      = `${h1} — Free Online Tool${globalSeo.defaults.titleSuffix}`;
      const description = modifier.description?.en || intent.description?.en || `${h1}. Free, browser-based, no signup required.`;
      const searchIntent = modifier.searchIntent || intent.searchIntent || 'transactional';

      const allFaq = [...(intent.faq || []), ...(modifier.faq || [])];

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs.homeName[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: 'How To', url: `${baseUrl}/${langCode}/how-to` },
        { name: h1, url: canonical },
      ];

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      };

      const webPageSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description,
        url: canonical,
        inLanguage: langCode,
        isPartOf: { '@type': 'WebSite', name: globalSeo.defaults.ogSiteName, url: baseUrl },
      };

      const schemas = [webPageSchema, breadcrumbSchema];

      if (allFaq.length > 0) {
        schemas.push({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: allFaq.map(f => ({
            '@type': 'Question',
            name: f.question?.en || '',
            acceptedAnswer: { '@type': 'Answer', text: f.answer?.en || '' },
          })),
        });
      }

      const howToSteps = intent.howToSteps?.en || [];
      if (howToSteps.length > 0) {
        schemas.push({
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: h1,
          tool: [{ '@type': 'HowToTool', name: tool.name?.en || tool.slug }],
          step: howToSteps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s })),
        });
      }

      seoData.set(route.path, {
        title, description, canonical, h1, searchIntent,
        robots: globalSeo.defaults.robots,
        ogTitle: title, ogDescription: description, ogUrl: canonical,
        ogType: 'website', ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary_large_image', twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [], hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs, schemas,
        primaryKeyword: `${intent.slug} ${modifier.slug}`.replace(/-/g, ' '),
      });

    } else if (route.type === 'how-to-index') {
      const canonical = `${baseUrl}${route.path}`;
      const title = `How-To Guides — Free File Conversion & Tools${globalSeo.defaults.titleSuffix}`;
      const description = 'Step-by-step guides for converting, compressing, and editing files. All tools are free and browser-based.';
      const h1 = 'How-To Guides — File Conversion & Tools';
      const breadcrumbs = [
        { name: globalSeo.breadcrumbs.homeName[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: 'How To', url: canonical },
      ];
      seoData.set(route.path, {
        title, description, canonical, h1, searchIntent: 'informational',
        robots: globalSeo.defaults.robots,
        ogTitle: title, ogDescription: description, ogUrl: canonical, ogType: 'website',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary_large_image', twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [], hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs,
        schemas: [{
          '@context': 'https://schema.org', '@type': 'BreadcrumbList',
          itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
        }],
      });

    } else if (route.type === 'platform') {
      const { platform } = route;
      const canonical = `${baseUrl}${route.path}`;
      const h1 = platform.h1?.en || platform.title?.en || platform.slug;
      const title = `${platform.title?.en || platform.slug}${globalSeo.defaults.titleSuffix}`;
      const description = platform.description?.en || `${h1}. Free, browser-based tools.`;
      const searchIntent = platform.searchIntent || 'commercial';

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs.homeName[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: 'Platform Tools', url: `${baseUrl}/${langCode}/platform` },
        { name: platform.title?.en || platform.slug, url: canonical },
      ];

      const breadcrumbSchema = {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      };

      const toolList = (route.tools || []).slice(0, 10);
      const itemListSchema = toolList.length > 0 ? {
        '@context': 'https://schema.org', '@type': 'ItemList',
        name: h1,
        itemListElement: toolList.map((t, i) => ({
          '@type': 'ListItem', position: i + 1,
          url: `${baseUrl}/${langCode}/${t.slug}`,
          name: t.name?.en || t.slug,
        })),
      } : null;

      const schemas = [breadcrumbSchema, { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: canonical, inLanguage: langCode }];
      if (itemListSchema) schemas.push(itemListSchema);

      const faqItems = platform.faq || [];
      if (faqItems.length > 0) {
        schemas.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqItems.map(f => ({ '@type': 'Question', name: f.question?.en || '', acceptedAnswer: { '@type': 'Answer', text: f.answer?.en || '' } })) });
      }

      seoData.set(route.path, {
        title, description, canonical, h1, searchIntent,
        robots: globalSeo.defaults.robots,
        ogTitle: title, ogDescription: description, ogUrl: canonical, ogType: 'website',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary_large_image', twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [], hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs, schemas,
        primaryKeyword: platform.seo?.primaryKeyword || platform.slug.replace(/-/g, ' '),
      });

    } else if (route.type === 'use-case') {
      const { useCase } = route;
      const canonical = `${baseUrl}${route.path}`;
      const h1 = useCase.h1?.en || useCase.title?.en || useCase.slug;
      const title = `${useCase.title?.en || useCase.slug}${globalSeo.defaults.titleSuffix}`;
      const description = useCase.description?.en || `${h1}. Free browser-based tools.`;
      const searchIntent = useCase.searchIntent || 'commercial';

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs.homeName[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: 'Use Cases', url: `${baseUrl}/${langCode}/use-case` },
        { name: useCase.title?.en || useCase.slug, url: canonical },
      ];

      const breadcrumbSchema = {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      };

      const toolList = (route.tools || []).slice(0, 8);
      const schemas = [breadcrumbSchema, { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: canonical, inLanguage: langCode }];
      if (toolList.length > 0) {
        schemas.push({ '@context': 'https://schema.org', '@type': 'ItemList', name: h1, itemListElement: toolList.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: `${baseUrl}/${langCode}/${t.slug}`, name: t.name?.en || t.slug })) });
      }
      const faqItems = useCase.faq || [];
      if (faqItems.length > 0) {
        schemas.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqItems.map(f => ({ '@type': 'Question', name: f.question?.en || '', acceptedAnswer: { '@type': 'Answer', text: f.answer?.en || '' } })) });
      }

      seoData.set(route.path, {
        title, description, canonical, h1, searchIntent,
        robots: globalSeo.defaults.robots,
        ogTitle: title, ogDescription: description, ogUrl: canonical, ogType: 'website',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary_large_image', twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [], hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs, schemas,
        primaryKeyword: useCase.seo?.primaryKeyword || useCase.slug.replace(/-/g, ' '),
      });

    } else if (route.type === 'feature') {
      const { feature } = route;
      const canonical = `${baseUrl}${route.path}`;
      const h1 = feature.h1?.en || feature.title?.en || feature.slug;
      const title = `${feature.title?.en || feature.slug}${globalSeo.defaults.titleSuffix}`;
      const description = feature.description?.en || `${h1}. Free browser-based tools.`;
      const searchIntent = feature.searchIntent || 'transactional';

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs.homeName[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: 'Features', url: `${baseUrl}/${langCode}/feature` },
        { name: feature.title?.en || feature.slug, url: canonical },
      ];

      const breadcrumbSchema = {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      };

      const toolList = (route.tools || []).slice(0, 12);
      const schemas = [breadcrumbSchema, { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: canonical, inLanguage: langCode }];
      if (toolList.length > 0) {
        schemas.push({ '@context': 'https://schema.org', '@type': 'ItemList', name: h1, itemListElement: toolList.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: `${baseUrl}/${langCode}/${t.slug}`, name: t.name?.en || t.slug })) });
      }
      const faqItems = feature.faq || [];
      if (faqItems.length > 0) {
        schemas.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqItems.map(f => ({ '@type': 'Question', name: f.question?.en || '', acceptedAnswer: { '@type': 'Answer', text: f.answer?.en || '' } })) });
      }

      seoData.set(route.path, {
        title, description, canonical, h1, searchIntent,
        robots: globalSeo.defaults.robots,
        ogTitle: title, ogDescription: description, ogUrl: canonical, ogType: 'website',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary_large_image', twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [], hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs, schemas,
        primaryKeyword: feature.seo?.primaryKeyword || feature.slug.replace(/-/g, ' '),
      });

    } else if (route.type === 'format-faq') {
      const { entity } = route;
      const canonical = `${baseUrl}${route.path}`;
      const h1 = `${entity.name} FAQ — Common Questions Answered`;
      const title = `${entity.name} FAQ${globalSeo.defaults.titleSuffix}`;
      const description = `Frequently asked questions about ${entity.name} (${entity.fullName || entity.name}). What it is, how to use it, common conversions, and more.`;

      const breadcrumbs = [
        { name: globalSeo.breadcrumbs.homeName[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
        { name: 'FAQ', url: `${baseUrl}/${langCode}/faq` },
        { name: `${entity.name} FAQ`, url: canonical },
      ];

      const breadcrumbSchema = {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      };

      const faqSchema = {
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: (entity.faq || []).map(f => ({
          '@type': 'Question',
          name: f.question?.en || f.question || '',
          acceptedAnswer: { '@type': 'Answer', text: f.answer?.en || f.answer || '' },
        })),
      };

      seoData.set(route.path, {
        title, description, canonical, h1, searchIntent: 'informational',
        robots: globalSeo.defaults.robots,
        ogTitle: title, ogDescription: description, ogUrl: canonical, ogType: 'website',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        twitterCard: 'summary_large_image', twitterSite: globalSeo.seo?.twitterHandle || '',
        hreflang: route.hreflang || [], hreflangDefault: route.hreflangDefault || canonical,
        breadcrumbs, schemas: [breadcrumbSchema, faqSchema],
        primaryKeyword: `${entity.name.toLowerCase()} faq`,
      });
    }
  }

  return seoData;
}
