import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { CommercialProposal, AdCampaign, Report, Payment, BrandAnalysis, CompanyProfile, AdAuditResult, UserData, OtherReport, AdCampaignAuditReport } from '../types';
import { v4 as uuidv4 } from 'uuid';

const getApiKey = (): string => {
  return localStorage.getItem('GEMINI_API_KEY') || (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.API_KEY || '';
};

// Initialization of GoogleGenAI is moved inside functions to ensure up-to-date API key usage as per guidelines.

// Navigation tool declaration for AI agents.
export const navigationFunctionDeclaration: FunctionDeclaration = {
  name: 'navigateToPage',
  description: 'Переходит на указанную страницу в приложении.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      page: {
        type: Type.STRING,
        description: 'Путь к странице.',
        enum: [
          '/dashboard', '/reports', '/other-reports', '/proposals',
          '/compare', '/conversions', '/net-conversions', '/campaigns',
          '/unit-economics', '/payments', '/knowledge-base', '/settings',
          '/brand-health', '/ai-assistant', '/shewhart-charts'
        ],
      },
    },
    required: ['page'],
  },
};

// Tool for creating arbitrary reports.
export const createOtherReportFunctionDeclaration: FunctionDeclaration = {
  name: 'createOtherReport',
  description: 'Создает новый произвольный отчет.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Название отчета' },
      date: { type: Type.STRING, description: 'Дата в формате YYYY-MM-DD' },
      category: { type: Type.STRING, enum: ['Склад', 'Логистика', 'HR', 'Производство', 'Другое'] },
      kpis: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            value: { type: Type.STRING }
          },
          required: ['name', 'value']
        }
      }
    },
    required: ['name', 'category', 'kpis']
  }
};

// Tool for updating KPI values in arbitrary reports.
export const updateOtherReportKpiFunctionDeclaration: FunctionDeclaration = {
  name: 'updateOtherReportKpi',
  description: 'Обновляет значение KPI в существующем произвольном отчете.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      reportName: { type: Type.STRING },
      kpiName: { type: Type.STRING },
      newValue: { type: Type.STRING }
    },
    required: ['reportName', 'kpiName', 'newValue']
  }
};

// Tool for creating commercial proposals.
export const createCommercialProposalFunctionDeclaration: FunctionDeclaration = {
  name: 'createCommercialProposal',
  description: 'Создает новое коммерческое предложение.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING, description: 'Дата в формате YYYY-MM-DD' },
      direction: { type: Type.STRING, enum: ['РТИ', '3D'] },
      company: { type: Type.STRING },
      item: { type: Type.STRING },
      amount: { type: Type.NUMBER }
    },
    required: ['direction', 'item', 'amount']
  }
};

// Tool for updating existing commercial proposals.
export const updateCommercialProposalFunctionDeclaration: FunctionDeclaration = {
  name: 'updateCommercialProposal',
  description: 'Обновляет поле существующего коммерческого предложения.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      company: { type: Type.STRING, description: 'Название компании для поиска КП' },
      fieldToUpdate: { type: Type.STRING, enum: ['status', 'amount', 'item', 'paymentDate'] },
      newValue: { type: Type.STRING, description: 'Новое значение' }
    },
    required: ['company', 'fieldToUpdate', 'newValue']
  }
};

/**
 * Generates a response from the AI assistant including potential tool calls.
 */
export const getAIAssistantResponse = async (prompt: string, userData: UserData, systemInstruction: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  // Create a structured data context for the AI
  const dataContext = {
    company: userData.companyProfile,
    marketingReports: userData.reports,
    commercialProposals: userData.proposals,
    adCampaigns: userData.campaigns,
    otherReports: userData.otherReports,
    payments: userData.payments,
    knowledgeBase: userData.knowledgeBase,
    companyStrategy: userData.companyStrategy || "Не загружена"
  };

  const strategyContext = userData.companyStrategy
    ? `СТРАТЕГИЯ КОМПАНИИ (ОБЯЗАТЕЛЬНО К УЧЕТУ):
${userData.companyStrategy}`
    : "Стратегия компании еще не загружена пользователем.";

  const fullSystemInstruction = `${systemInstruction}
Ты — Люми, эксперт в области бизнес-аналитики и стратегического планирования. Ты общаешься от женского лица в профессиональном, но доброжелательном тоне.
Твоя основная задача — помогать пользователю глубоко анализировать бизнес-данные и предлагать стратегические решения.

ПРАВИЛА ОФОРМЛЕНИЯ ОТВЕТОВ:
1. Используй Markdown для структурирования:
   - Списки для перечислений.
   - ТАБЛИЦЫ для KPI и сравнения цифр.
   - Жирный шрифт (**текст**) для акцентов и заголовков секций.
2. СТРОГО ЗАПРЕЩЕНО использовать символы "###", технические заголовки или другие лишние маркеры.
3. ОБЯЗАТЕЛЬНАЯ СТРУКТУРА:
   - Основной детальный ответ.
   - **Краткий вывод**: (в 1-2 предложениях резюмируй ответ).
   - **Рекомендация эксперта**: (конкретное действие или совет на основе данных).
4. ЦИТИРОВАНИЕ: Всегда ставь сноски [^1], [^2] при использовании цифр.
5. ТОН: Профессиональный, экспертный, лаконичный.

${strategyContext}

ТЕКУЩИЕ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ:
${JSON.stringify(dataContext, null, 2)}

При ответах на вопросы о цифрах, всегда используй эти данные. Если данных нет, честно скажи об этом.
Ты можешь переходить на страницы приложения, создавать отчеты и обновлять данные, используя инструменты (функции).`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: fullSystemInstruction,
      tools: [{
        functionDeclarations: [
          navigationFunctionDeclaration,
          createOtherReportFunctionDeclaration,
          updateOtherReportKpiFunctionDeclaration,
          createCommercialProposalFunctionDeclaration,
          updateCommercialProposalFunctionDeclaration
        ]
      }]
    }
  });

  const functionCall = response.functionCalls?.[0];
  return {
    text: response.text || "",
    functionCall: functionCall ? { name: functionCall.name, args: functionCall.args } : undefined
  };
};

/**
 * Runs a structured AI audit for advertising campaigns.
 */
export const runCampaignAuditStructured = async (campaigns: AdCampaign[]): Promise<AdCampaignAuditReport> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = `
    Проведи глубокий аудит следующих рекламных кампаний Google Ads:
    ${JSON.stringify(campaigns.map(c => ({
    name: c.name,
    spend: c.spend,
    conv: c.conversions,
    ctr: c.ctr,
    cpa: c.cpa,
    clicks: c.clicks,
    impr: c.impressions
  })))}
    
    Твоя задача для КАЖДОЙ кампании:
    1. Оценить эффективность по 10-бальной шкале.
    2. Определить уровень эффективности (Высокая, Средняя, Низкая).
    3. Сформулировать краткий вердикт.
    4. Дать конкретную рекомендацию по оптимизации.
    5. Выделить плюсы и минусы.
    
    Также дай общую оценку всего аккаунта и глобальный вердикт.
    Верни результат строго в формате JSON.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          globalScore: { type: Type.NUMBER },
          globalVerdict: { type: Type.STRING },
          campaigns: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                campaignName: { type: Type.STRING },
                score: { type: Type.NUMBER },
                efficiency: { type: Type.STRING, enum: ['Высокая', 'Средняя', 'Низкая'] },
                verdict: { type: Type.STRING },
                recommendation: { type: Type.STRING },
                pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                cons: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['campaignName', 'score', 'efficiency', 'verdict', 'recommendation', 'pros', 'cons']
            }
          }
        },
        required: ['globalScore', 'globalVerdict', 'campaigns']
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  return {
    ...data,
    timestamp: new Date().toISOString()
  };
};

/**
 * Analyzes a report image and extracts structured metrics.
 */
export const analyzeReportImage = async (mimeType: string, base64Data: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = "Извлеки данные из этого маркетингового отчета. Верни JSON с ключами 'РТИ' и '3D', каждый из которых содержит объект с метриками: budget, clicks, leads, proposals, invoices, deals, sales.";
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          'РТИ': {
            type: Type.OBJECT,
            properties: {
              budget: { type: Type.NUMBER },
              clicks: { type: Type.NUMBER },
              leads: { type: Type.NUMBER },
              proposals: { type: Type.NUMBER },
              invoices: { type: Type.NUMBER },
              deals: { type: Type.NUMBER },
              sales: { type: Type.NUMBER }
            }
          },
          '3D': {
            type: Type.OBJECT,
            properties: {
              budget: { type: Type.NUMBER },
              clicks: { type: Type.NUMBER },
              leads: { type: Type.NUMBER },
              proposals: { type: Type.NUMBER },
              invoices: { type: Type.NUMBER },
              deals: { type: Type.NUMBER },
              sales: { type: Type.NUMBER }
            }
          }
        }
      }
    }
  });
  return response.text || "{}";
};

/**
 * Analyzes an image containing commercial proposals and extracts structured data.
 */
export const analyzeProposalsImage = async (mimeType: string, base64Data: string): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = "Извлеки данные о коммерческих предложениях из этого файла. Верни JSON с ключами 'РТИ' и '3D', каждый из которых содержит массив объектов с полями: date, company, item, amount, invoiceNumber, invoiceDate, paymentDate.";
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          'РТИ': {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                company: { type: Type.STRING },
                item: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                invoiceNumber: { type: Type.STRING },
                invoiceDate: { type: Type.STRING },
                paymentDate: { type: Type.STRING }
              }
            }
          },
          '3D': {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                company: { type: Type.STRING },
                item: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                invoiceNumber: { type: Type.STRING },
                invoiceDate: { type: Type.STRING },
                paymentDate: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

/**
 * Analyzes a Google Ads report image and extracts detailed campaign information.
 */
export const analyzeCampaignsDetailed = async (mimeType: string, base64Data: string): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = "Проанализируй отчет по рекламным кампаниям Google Ads. Извлеки список кампаний со следующими данными: name, status, budget, budgetType, impressions, clicks, ctr, spend, conversions, cpc, conversionRate, cpa, strategy.";
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            status: { type: Type.STRING },
            budget: { type: Type.NUMBER },
            budgetType: { type: Type.STRING },
            impressions: { type: Type.NUMBER },
            clicks: { type: Type.NUMBER },
            ctr: { type: Type.NUMBER },
            spend: { type: Type.NUMBER },
            conversions: { type: Type.NUMBER },
            cpc: { type: Type.NUMBER },
            conversionRate: { type: Type.NUMBER },
            cpa: { type: Type.NUMBER },
            strategy: { type: Type.STRING }
          }
        }
      }
    }
  });
  return JSON.parse(response.text || "[]");
};

/**
 * Analyzes marketing reports for trends and data consistency.
 */
export const analyzeDataConsistency = async (reports: Report[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = `Проанализируй эти маркетинговые отчеты на предмет аномалий, трендов и несоответствий. Дай краткий экспертный вердикт.\n\nДанные: ${JSON.stringify(reports)}`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt
  });
  return response.text || "Нет данных для анализа.";
};

/**
 * Fetches company information based on BIN/TIN using search grounding.
 */
export const fetchCompanyDataByBin = async (bin: string): Promise<Partial<CompanyProfile>> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = `Используй Google Search, чтобы найти информацию о компании по БИН: ${bin}. Найди юридическое название, адрес, контактные данные, сайты, соцсети и краткое описание деятельности.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          companyName: { type: Type.STRING },
          about: { type: Type.STRING },
          details: {
            type: Type.OBJECT,
            properties: {
              legalName: { type: Type.STRING },
              legalAddress: { type: Type.STRING },
              tin: { type: Type.STRING }
            }
          },
          contacts: {
            type: Type.OBJECT,
            properties: {
              phones: { type: Type.ARRAY, items: { type: Type.STRING } },
              email: { type: Type.STRING },
              address: { type: Type.STRING }
            }
          },
          websites: { type: Type.ARRAY, items: { type: Type.STRING } },
          socialMedia: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

/**
 * Analyzes a payment invoice/receipt image and extracts relevant payment data.
 */
export const analyzePaymentInvoice = async (mimeType: string, base64Data: string): Promise<Partial<Payment>> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = "Проанализируй этот инвойс/счет на оплату. Извлеки: название сервиса, сумму, валюту, дату платежа, периодичность (monthly/yearly/onetime), реквизиты получателя (название, БИН, банк, ИИК).";
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          serviceName: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          currency: { type: Type.STRING },
          lastPaymentDate: { type: Type.STRING },
          paymentPeriod: { type: Type.STRING },
          recipientName: { type: Type.STRING },
          recipientBin: { type: Type.STRING },
          recipientBank: { type: Type.STRING },
          recipientIic: { type: Type.STRING }
        }
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

/**
 * Suggests audit keywords for brand health monitoring.
 */
export const suggestAuditKeywords = async (companyName: string, about: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = `На основе названия компании "${companyName}" и описания "${about}", предложи 5 ключевых слов для аудита рекламной выдачи в Google.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });
  return JSON.parse(response.text || "[]");
};

/**
 * Performs a deep brand health analysis using real-time search.
 */
export const performBrandHealthAnalysis = async (companyName: string, about: string): Promise<BrandAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = `
        Выполни МАКСИМАЛЬНО ГЛУБОКИЙ аудит бренда "${companyName}" используя поиск в реальном времени.
        
        ТВОИ ЗАДАЧИ (ИСПОЛЬЗУЙ ИНСТРУМЕНТ ПОИСКА):
        1. НАЙДИ РЕАЛЬНЫЕ ОТЗЫВЫ: Обязательно найди и извлеки последние отзывы с Yandex Maps, 2GIS, Google Maps. 
           Ищи также упоминания в соцсетях (Instagram, LinkedIn, Facebook) и на форумах.
        2. СОБЕРИ ПРЯМЫЕ ССЫЛКИ: Собери минимум 10 прямых ссылок на статьи, пресс-релизы, новости или каталоги, где упоминается компания.
        3. АНАЛИЗ КОНКУРЕНТОВ: Найди 4-5 реальных конкурентов, укажи их сайты и долю рынка.
        4. SWOT: Сформируй детальную SWOT-матрицу на основе найденных свежих данных.
        
        Верни данные СТРОГО в формате JSON.
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentimentScore: { type: Type.NUMBER },
            trustIndex: { type: Type.NUMBER },
            mentionsCount: { type: Type.NUMBER },
            reviews: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  author: { type: Type.STRING },
                  date: { type: Type.STRING },
                  rating: { type: Type.NUMBER },
                  platform: { type: Type.STRING },
                  text: { type: Type.STRING },
                  sentiment: { type: Type.STRING, enum: ['positive', 'neutral', 'negative'] },
                  url: { type: Type.STRING }
                }
              }
            },
            mentions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  url: { type: Type.STRING },
                  date: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  sourceType: { type: Type.STRING, enum: ['article', 'social', 'forum', 'directory'] }
                }
              }
            },
            swot: {
              type: Type.OBJECT,
              properties: {
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                threats: { type: Type.ARRAY, items: { type: Type.STRING } },
              }
            },
            competitors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                  cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                  strategyHint: { type: Type.STRING },
                  marketShare: { type: Type.STRING },
                  website: { type: Type.STRING }
                }
              }
            },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("Пустой ответ от AI.");

    const data = JSON.parse(responseText);
    return {
      ...data,
      lastUpdate: new Date().toISOString(),
      sources: []
    };
  } catch (error) {
    console.error("Brand analysis error:", error);
    throw error;
  }
};

/**
 * Runs an advertisement audit for a specific keyword and location.
 */
export const runAdAudit = async (keyword: string, location: string, companyProfile: CompanyProfile): Promise<AdAuditResult> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = `
        Используй инструмент Google Search, чтобы получить АКТУАЛЬНУЮ поисковую выдачу.
        Запрос: "${keyword}"
        Локация/Region: "${location}"
        
        Твоя задача:
        1. Изучи рекламные блоки (Sponsored/Реклама) в самом верху выдачи Google.
        2. Извлеки названия компаний-рекламодателей, их офферы (текст объявления) и прямые ссылки на лендинги.
        3. Найди Топ-3 органической выдачи.
        4. Сравни предложения конкурентов с нашей компанией (${companyProfile.companyName}) и дай краткий AI-вердикт.
        
        Ответ верни СТРОГО в формате JSON.
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            advertisers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  offer: { type: Type.STRING },
                  link: { type: Type.STRING }
                }
              }
            },
            organicTop: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  link: { type: Type.STRING }
                }
              }
            },
            marketAnalysis: { type: Type.STRING }
          }
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    return {
      id: uuidv4(),
      keyword,
      location,
      timestamp: new Date().toISOString(),
      ...data
    };
  } catch (error) {
    console.error("Ad audit error:", error);
    throw new Error("Не удалось выполнить аудит рекламной выдачи.");
  }
};

/**
 * Extracts plain text from a document (PDF, DOCX) using Gemini.
 */
export const extractTextFromDocument = async (mimeType: string, base64Data: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = "Извлеки весь текст из этого документа и верни его как чистый текст (plain text) без лишних комментариев.";
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: prompt }
      ]
    }
  });
  return response.text || "";
};
