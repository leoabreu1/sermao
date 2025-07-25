export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Responder a OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verificar se é método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido. Use POST.' });
  }

  try {
    const { tema, versiculo } = req.body;

    // Validar dados de entrada
    if (!tema || !versiculo) {
      return res.status(400).json({ 
        erro: 'Parâmetros obrigatórios: tema e versiculo' 
      });
    }

    // Verificar se a chave da API está configurada
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        erro: 'Chave da API OpenRouter não configurada' 
      });
    }

    // Prompt para geração do sermão
    const prompt = `Gere um sermão cristão completo em português baseado no seguinte:

TEMA: ${tema}
VERSÍCULO: ${versiculo}

Estruture o sermão da seguinte forma:
1. INTRODUÇÃO - Uma introdução envolvente que conecte o tema com a vida cotidiana
2. CONTEXTO BÍBLICO - Explicação do contexto histórico e teológico do versículo
3. DESENVOLVIMENTO - 3 pontos principais com explicações e aplicações práticas
4. APLICAÇÃO - Como aplicar o ensino na vida diária
5. CONCLUSÃO - Resumo inspirador e chamada à ação
6. ORAÇÃO FINAL - Uma oração relacionada ao tema

O sermão deve ter aproximadamente 1500-2000 palavras, ser teologicamente sólido, inspirador e prático para os ouvintes.`;

    // Fazer requisição para OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.VERCEL_URL || 'https://sermao-gerador.vercel.app',
        'X-Title': 'Gerador de Sermões'
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro da API OpenRouter:', errorData);
      return res.status(500).json({ 
        erro: 'Erro ao comunicar com a API de IA',
        detalhes: response.status === 401 ? 'Chave da API inválida' : 'Erro interno da API'
      });
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return res.status(500).json({ 
        erro: 'Resposta inválida da API de IA' 
      });
    }

    const sermaoGerado = data.choices[0].message.content;

    // Retornar resultado
    return res.status(200).json({ 
      resultado: sermaoGerado,
      tema: tema,
      versiculo: versiculo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return res.status(500).json({ 
      erro: 'Erro interno do servidor',
      detalhes: error.message 
    });
  }
}