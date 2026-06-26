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
        schemas: [appSchema, faqSchema, breadcrumbSchema],
        primaryKeyword: tool.seo.primaryKeyword,
        secondaryKeywords: tool.seo.secondaryKeywords || [],
      });
    } else if (route.type === 'category') {
      const category = route.category;
      const name = category.name[langCode] || category.name.en;
      const desc = category.description[langCode] || category.description.en;
      const title = `${name}${globalSeo.defaults.titleSuffix}`;
      const canonical = `${baseUrl}${route.path}`;

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
        breadcrumbs: [
          { name: globalSeo.breadcrumbs.homeName[langCode] || 'Home', url: `${baseUrl}/${langCode}` },
          { name, url: canonical },
        ],
        schemas: [],
      });
    } else if (route.type === 'home') {
      const canonical = `${baseUrl}${route.path}`;
      seoData.set(route.path, {
        title: `${config.site.name} — ${config.site.tagline}`,
        description: lang?.ui?.privacyNote || '',
        canonical,
        robots: globalSeo.defaults.robots,
        ogType: 'website',
        ogSiteName: globalSeo.defaults.ogSiteName,
        ogImage: `${baseUrl}${globalSeo.seo?.defaultImagePath || '/assets/images/og-default.png'}`,
        schemas: [],
      });
    }
  }

  return seoData;
}
