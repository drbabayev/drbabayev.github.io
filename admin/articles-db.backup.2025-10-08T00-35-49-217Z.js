// Article Database
// This file contains all blog articles metadata and content registry

const articlesDB = {
  "ART001": {
    "code": "ART001",
    "category": "computational-biology",
    "date": "2023-10-27",
    "image": "/images/cytometry.jpg",
    "availableLanguages": [
      "en",
      "tr",
      "az",
      "de"
    ],
    "translations": {
      "en": {
        "title": "Tools in Cytometry Analysis",
        "excerpt": "A comprehensive guide to the most important tools and software for analyzing flow and mass cytometry data.",
        "slug": "cytometry-analysis-tools"
      },
      "tr": {
        "title": "Sitometri Veri Analizi için Temel Araçlar",
        "excerpt": "Akış ve kütle sitometrisi verilerini analiz etmek için en önemli araçlar ve yazılımlar hakkında kapsamlı bir rehber.",
        "slug": "sitometri-analiz-araclari"
      },
      "az": {
        "title": "Sitometriya Məlumat Təhlili üçün Əsas Alətlər",
        "excerpt": "Axın və kütlə sitometriyası məlumatlarını təhlil etmək üçün ən mühüm alətlər və proqram təminatı haqqında əhatəli bələdçi.",
        "slug": "sitometriya-tehlil-aletleri"
      },
      "de": {
        "title": "Wesentliche Werkzeuge für die Zytometriedatenanalyse",
        "excerpt": "Ein umfassender Leitfaden zu den wichtigsten Tools und Software für die Analyse von Durchfluss- und Massenzytometriedaten.",
        "slug": "zytometrie-analyse-werkzeuge"
      }
    }
  },
  "ART002": {
    "code": "ART002",
    "category": "computational-biology",
    "date": "2024-07-26",
    "image": "/images/scrna.jpg",
    "availableLanguages": [
      "en",
      "tr",
      "az",
      "de"
    ],
    "translations": {
      "en": {
        "title": "A Complete Guide to scRNA-seq Analysis",
        "excerpt": "Learn the complete workflow for analyzing single-cell RNA sequencing data, from preprocessing to advanced analysis.",
        "slug": "scrna-seq-analysis-guide"
      },
      "tr": {
        "title": "Tek Hücreli RNA-Seq Analizi: Kapsamlı Bir Rehber",
        "excerpt": "Tek hücreli RNA dizileme verilerini ön işlemeden ileri düzey analize kadar analiz etmek için eksiksiz iş akışını öğrenin.",
        "slug": "tek-hucreli-rna-seq-rehberi"
      },
      "az": {
        "title": "Tək Hüceyrəli RNA-Seq Təhlili: Əhatəli Bələdçi",
        "excerpt": "Tək hüceyrəli RNA ardıcıllığı məlumatlarını ilkin emaldan qabaqcıl təhlilə qədər təhlil etmək üçün tam iş axınını öyrənin.",
        "slug": "tek-huceyreli-rna-seq-beledci"
      },
      "de": {
        "title": "Einzelzell-RNA-Seq-Analyse: Ein umfassender Leitfaden",
        "excerpt": "Lernen Sie den vollständigen Workflow für die Analyse von Einzelzell-RNA-Sequenzierungsdaten, von der Vorverarbeitung bis zur erweiterten Analyse.",
        "slug": "einzelzell-rna-seq-leitfaden"
      }
    }
  },
  "ART003": {
    "code": "ART003",
    "category": "epithelial-barrier",
    "date": "2024-09-05",
    "image": "/images/all16318-fig-0001-m.jpg",
    "availableLanguages": [
      "en",
      "tr",
      "az",
      "de"
    ],
    "translations": {
      "en": {
        "title": "Are Leaky Barriers the Hidden Cause of Modern Chronic Diseases?",
        "excerpt": "Exploring the epithelial barrier theory and its role in chronic non-communicable diseases through molecular mechanisms.",
        "slug": "leaky-barriers-chronic-diseases"
      },
      "tr": {
        "title": "Sızan Baryerler Modern Kronik Hastalıkların Gizli Nedeni mi?",
        "excerpt": "Epitel bariyer teorisini ve moleküler mekanizmalar yoluyla kronik bulaşıcı olmayan hastalıklardaki rolünü keşfetme.",
        "slug": "sizan-baryerler-kronik-hastaliklar"
      },
      "az": {
        "title": "Sızan Baryerlər Müasir Xroniki Xəstəliklərin Gizli Səbəbidirmi?",
        "excerpt": "Epitelyal baryer nəzəriyyəsinin və molekulyar mexanizmlər vasitəsilə xroniki qeyri-yoluxucu xəstəliklərdə rolunun tədqiqi.",
        "slug": "sizan-baryerler-xroniki-xestelikler"
      },
      "de": {
        "title": "Sind undichte Barrieren die versteckte Ursache moderner chronischer Krankheiten?",
        "excerpt": "Erforschung der Epithelbarriere-Theorie und ihrer Rolle bei chronischen nicht übertragbaren Krankheiten durch molekulare Mechanismen.",
        "slug": "undichte-barrieren-chronische-krankheiten"
      }
    }
  },
  "ART004": {
    "code": "ART004",
    "category": "computational-biology",
    "date": "2024-01-01",
    "image": "",
    "availableLanguages": [
      "en"
    ],
    "translations": {
      "en": {
        "title": "Sample Blog Post",
        "excerpt": "This is a sample blog post for testing purposes.",
        "slug": "sample-post"
      },
      "tr": {
        "title": "Örnek Blog Yazısı",
        "excerpt": "Bu, test amaçlı örnek bir blog yazısıdır.",
        "slug": "ornek-blog-yazisi"
      },
      "az": {
        "title": "Nümunə Bloq Yazısı",
        "excerpt": "Bu, test məqsədli nümunə bloq yazısıdır.",
        "slug": "numune-bloq-yazisi"
      },
      "de": {
        "title": "Beispiel-Blogbeitrag",
        "excerpt": "Dies ist ein Beispiel-Blogbeitrag zu Testzwecken.",
        "slug": "beispiel-blogbeitrag"
      }
    }
  }
};

// Helper functions
const ArticlesDB = {
    getAll() { return Object.values(articlesDB); },
    getByCode(code) { return articlesDB[code]; },
    getByCategory(category) { return Object.values(articlesDB).filter(a => a.category === category); },
    getByCategoryAndLanguage(category, lang) { return Object.values(articlesDB).filter(a => a.category === category && a.availableLanguages && a.availableLanguages.includes(lang)); },
    add(article) { articlesDB[article.code] = article; return article; },
    update(code, updates) { if (articlesDB[code]) { articlesDB[code] = { ...articlesDB[code], ...updates }; return articlesDB[code]; } return null; },
    delete(code) { delete articlesDB[code]; },
    getNextCode() { const codes = Object.keys(articlesDB).map(code => parseInt(code.replace('ART', ''))).filter(num => !isNaN(num)); const maxNum = Math.max(...codes, 0); return `ART${String(maxNum + 1).padStart(3, '0')}`; },
    exportJSON() { return JSON.stringify(articlesDB, null, 2); },
    importJSON(json) { try { const data = JSON.parse(json); Object.assign(articlesDB, data); return true; } catch (e) { console.error('Failed to import:', e); return false; } },
    getArticleURL(code, lang = 'en') { const article = articlesDB[code]; if (!article) return null; return `/blog/articles/${code}-${lang}.html`; },
    getBlogURL(lang = 'en') { return `/blog.html`; },
    isAvailableInLanguage(code, lang) { const article = articlesDB[code]; return article && article.availableLanguages && article.availableLanguages.includes(lang); },
    getAvailableLanguages(code) { const article = articlesDB[code]; return article && article.availableLanguages ? article.availableLanguages : ['en']; }
};

if (typeof window !== 'undefined') {
    window.articlesDB = articlesDB;
    window.ArticlesDB = ArticlesDB;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { articlesDB, ArticlesDB };
}
