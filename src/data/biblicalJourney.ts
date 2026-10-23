export interface JourneyQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  answer: number;
  explanation: string;
  reference: string;
}

export interface JourneyChapter {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  lessonTitle: string;
  questions: JourneyQuestion[];
}

// Perguntas baseadas em passagens identificáveis. A referência aponta para o texto
// bíblico que fundamenta a resposta; não é uma citação literal de tradução específica.
export const biblicalJourney: JourneyChapter[] = [
  { id: 1, title: 'Criação do Mundo', subtitle: 'O começo de todas as coisas', icon: '🌍', lessonTitle: 'No princípio', questions: [
    { id: 'c1q1', question: 'Segundo Gênesis, quem criou os céus e a terra?', options: ['Moisés', 'Deus', 'Abraão', 'Noé'], answer: 1, explanation: 'Gênesis começa afirmando que Deus criou os céus e a terra.', reference: 'Gênesis 1:1' },
    { id: 'c1q2', question: 'À imagem de quem a humanidade foi criada?', options: ['Dos anjos', 'Dos animais', 'De Deus', 'Dos reis'], answer: 2, explanation: 'O relato da criação declara que Deus criou o ser humano à sua imagem.', reference: 'Gênesis 1:26–27' },
  ]},
  { id: 2, title: 'Adão e Eva', subtitle: 'O jardim e a escolha humana', icon: '🌿', lessonTitle: 'O jardim do Éden', questions: [
    { id: 'c2q1', question: 'Do que Deus formou o homem, segundo Gênesis?', options: ['Do pó da terra', 'Da água do mar', 'Da madeira', 'Da pedra'], answer: 0, explanation: 'Gênesis descreve Deus formando o homem do pó da terra e soprando nele o fôlego de vida.', reference: 'Gênesis 2:7' },
    { id: 'c2q2', question: 'Qual fruto foi proibido no jardim?', options: ['Maçã, explicitamente nomeada', 'Figo', 'O fruto da árvore do conhecimento do bem e do mal', 'Uva'], answer: 2, explanation: 'O texto identifica a árvore pelo conhecimento do bem e do mal; não informa que o fruto era uma maçã.', reference: 'Gênesis 2:16–17; 3:1–6' },
  ]},
  { id: 3, title: 'Noé e o Dilúvio', subtitle: 'Obediência e aliança', icon: '🌧️', lessonTitle: 'A arca', questions: [
    { id: 'c3q1', question: 'O que Deus mandou Noé construir?', options: ['Uma torre', 'Uma arca', 'Um templo', 'Um palácio'], answer: 1, explanation: 'Deus instruiu Noé a construir uma arca para preservar sua família e os animais.', reference: 'Gênesis 6:14–19' },
    { id: 'c3q2', question: 'Qual sinal foi dado como aliança após o dilúvio?', options: ['Uma estrela', 'Uma oliveira', 'O arco nas nuvens', 'Uma coluna de fogo'], answer: 2, explanation: 'O arco nas nuvens foi apresentado como sinal da aliança de Deus com a terra.', reference: 'Gênesis 9:12–17' },
  ]},
  { id: 4, title: 'Abraão e os Patriarcas', subtitle: 'Fé e promessa', icon: '⭐', lessonTitle: 'Uma promessa', questions: [
    { id: 'c4q1', question: 'Para onde Deus chamou Abrão para ir?', options: ['Para a terra que Deus lhe mostraria', 'Para o Egito para ser rei', 'Para Nínive', 'Para Roma'], answer: 0, explanation: 'Deus chamou Abrão a sair de sua terra e ir para a terra que lhe mostraria.', reference: 'Gênesis 12:1–4' },
    { id: 'c4q2', question: 'O que Abraão fez, e isso lhe foi contado como justiça?', options: ['Construiu uma cidade', 'Creu no Senhor', 'Tornou-se sacerdote do Egito', 'Venceu um gigante'], answer: 1, explanation: 'O relato afirma que Abraão creu no Senhor e isso lhe foi imputado como justiça.', reference: 'Gênesis 15:6' },
  ]},
  { id: 5, title: 'José do Egito', subtitle: 'Providência em tempos difíceis', icon: '🌾', lessonTitle: 'Dos sonhos ao governo', questions: [
    { id: 'c5q1', question: 'Quem comprou José depois que ele foi vendido pelos irmãos?', options: ['Faraó diretamente', 'Potifar, oficial de Faraó', 'Moisés', 'Golias'], answer: 1, explanation: 'José foi levado ao Egito e vendido a Potifar, oficial de Faraó.', reference: 'Gênesis 37:28, 36; 39:1' },
    { id: 'c5q2', question: 'Que tarefa Faraó confiou a José?', options: ['Comandar o exército de Israel', 'Construir a arca', 'Administrar o Egito durante a crise', 'Escrever os Salmos'], answer: 2, explanation: 'Após interpretar os sonhos, José foi colocado sobre a casa de Faraó e sobre o Egito.', reference: 'Gênesis 41:39–41' },
  ]},
  { id: 6, title: 'Moisés e o Êxodo', subtitle: 'Libertação do povo', icon: '🌊', lessonTitle: 'Saída do Egito', questions: [
    { id: 'c6q1', question: 'Quem Deus enviou para tirar Israel do Egito?', options: ['Josué', 'Moisés', 'Samuel', 'Elias'], answer: 1, explanation: 'Deus chamou Moisés para conduzir o povo de Israel para fora do Egito.', reference: 'Êxodo 3:10' },
    { id: 'c6q2', question: 'O que aconteceu quando Moisés estendeu a mão sobre o mar?', options: ['O mar se abriu', 'Choveu maná', 'As muralhas caíram', 'O Jordão secou'], answer: 0, explanation: 'Deus fez o mar recuar, permitindo que os israelitas atravessassem em terra seca.', reference: 'Êxodo 14:21–22' },
  ]},
  { id: 7, title: 'Josué e a Terra Prometida', subtitle: 'Coragem e confiança', icon: '🛡️', lessonTitle: 'A travessia e Jericó', questions: [
    { id: 'c7q1', question: 'Quem sucedeu Moisés na liderança de Israel?', options: ['Josué', 'Davi', 'Arão', 'Salomão'], answer: 0, explanation: 'Josué foi comissionado para conduzir o povo após Moisés.', reference: 'Josué 1:1–2' },
    { id: 'c7q2', question: 'O que aconteceu com as muralhas de Jericó após o povo obedecer às instruções?', options: ['Foram cobertas por neve', 'Caíram', 'Viraram água', 'Foram reconstruídas por Salomão'], answer: 1, explanation: 'Depois da marcha e do toque das trombetas, as muralhas caíram e o povo entrou na cidade.', reference: 'Josué 6:15–20' },
  ]},
  { id: 8, title: 'Juízes e Reis', subtitle: 'Liderança e escolhas', icon: '👑', lessonTitle: 'O povo pede um rei', questions: [
    { id: 'c8q1', question: 'Quem era o juiz canhoto que libertou Israel de Eglom?', options: ['Sansão', 'Eúde', 'Gideão', 'Samuel'], answer: 1, explanation: 'O livro de Juízes descreve Eúde como canhoto e relata a libertação de Israel de Moabe.', reference: 'Juízes 3:15–30' },
    { id: 'c8q2', question: 'Quem ungiu Saul como rei de Israel?', options: ['Natã', 'Elias', 'Samuel', 'Isaías'], answer: 2, explanation: 'Samuel ungiu Saul e anunciou que ele seria príncipe sobre Israel.', reference: '1 Samuel 10:1' },
  ]},
  { id: 9, title: 'Davi e Salomão', subtitle: 'Coragem e sabedoria', icon: '🎵', lessonTitle: 'Reis de Israel', questions: [
    { id: 'c9q1', question: 'Com que arma Davi derrotou Golias?', options: ['Uma espada de bronze', 'Uma funda e uma pedra', 'Uma lança', 'Um arco'], answer: 1, explanation: 'Davi foi ao encontro de Golias com sua funda e uma pedra.', reference: '1 Samuel 17:49–50' },
    { id: 'c9q2', question: 'O que Salomão pediu a Deus para governar o povo?', options: ['Riqueza acima de tudo', 'Longa vida para si', 'Sabedoria e entendimento', 'Um exército maior'], answer: 2, explanation: 'Salomão pediu um coração entendido para julgar o povo e discernir entre o bem e o mal.', reference: '1 Reis 3:9–12' },
  ]},
  { id: 10, title: 'Profetas', subtitle: 'Chamados para anunciar a palavra', icon: '📜', lessonTitle: 'Ouvir e responder', questions: [
    { id: 'c10q1', question: 'Qual foi a resposta de Isaías ao chamado de Deus?', options: ['“Eis-me aqui, envia-me a mim”', '“Não conheço o caminho”', '“Construa uma arca”', '“Volte para o Egito”'], answer: 0, explanation: 'Isaías respondeu prontamente ao chamado: estava disposto a ser enviado.', reference: 'Isaías 6:8' },
    { id: 'c10q2', question: 'Para qual cidade Jonas recebeu ordem de ir antes de fugir?', options: ['Belém', 'Nínive', 'Jericó', 'Damasco'], answer: 1, explanation: 'Deus enviou Jonas a Nínive para anunciar contra a maldade da cidade.', reference: 'Jonas 1:1–3' },
  ]},
  { id: 11, title: 'Nascimento de Jesus', subtitle: 'A promessa se cumpre', icon: '✨', lessonTitle: 'Boas-novas', questions: [
    { id: 'c11q1', question: 'Em qual cidade Jesus nasceu?', options: ['Nazaré', 'Jerusalém', 'Belém', 'Cafarnaum'], answer: 2, explanation: 'Os relatos do nascimento situam Jesus em Belém.', reference: 'Mateus 2:1; Lucas 2:4–7' },
    { id: 'c11q2', question: 'Quem recebeu a notícia do nascimento de Jesus nos campos?', options: ['Pescadores', 'Pastores', 'Soldados romanos', 'Escribas no templo'], answer: 1, explanation: 'Um anjo anunciou aos pastores o nascimento do Salvador.', reference: 'Lucas 2:8–11' },
  ]},
  { id: 12, title: 'Milagres e Parábolas', subtitle: 'Sinais e ensinamentos de Jesus', icon: '🕊️', lessonTitle: 'Aprender com Jesus', questions: [
    { id: 'c12q1', question: 'O que Jesus fez durante a tempestade no mar?', options: ['Acendeu uma fogueira', 'Repreendeu o vento e o mar', 'Construiu um barco novo', 'Chamou os soldados'], answer: 1, explanation: 'Jesus repreendeu o vento e ordenou ao mar que se aquietasse.', reference: 'Marcos 4:37–39' },
    { id: 'c12q2', question: 'Na parábola, o pastor deixa as noventa e nove para procurar o quê?', options: ['Uma moeda', 'Uma casa', 'Uma ovelha perdida', 'Um talento de ouro'], answer: 2, explanation: 'A parábola da ovelha perdida ilustra a busca por quem se perdeu.', reference: 'Lucas 15:3–7' },
  ]},
  { id: 13, title: 'Morte e Ressurreição de Jesus', subtitle: 'A cruz e a vitória sobre a morte', icon: '✝️', lessonTitle: 'Ele ressuscitou', questions: [
    { id: 'c13q1', question: 'Segundo Lucas, o que Jesus disse ao entregar o espírito?', options: ['“Está tudo perdido”', '“Pai, nas tuas mãos entrego o meu espírito”', '“Construam um templo”', '“Voltem para o Egito”'], answer: 1, explanation: 'Lucas registra essas palavras de Jesus antes de morrer.', reference: 'Lucas 23:46' },
    { id: 'c13q2', question: 'Qual mensagem foi anunciada no túmulo vazio?', options: ['Ele foi levado para Roma', 'Ele não está aqui, mas ressuscitou', 'Os discípulos o esconderam', 'A cidade foi destruída'], answer: 1, explanation: 'As mulheres ouviram que Jesus havia ressuscitado, conforme ele havia anunciado.', reference: 'Lucas 24:5–7' },
  ]},
  { id: 14, title: 'Igreja Primitiva', subtitle: 'O Espírito Santo e a comunidade', icon: '🔥', lessonTitle: 'O início da igreja', questions: [
    { id: 'c14q1', question: 'O que aconteceu com os discípulos no dia de Pentecostes?', options: ['Receberam o Espírito Santo', 'Construíram a arca', 'Coroaram Paulo', 'Voltaram ao Egito'], answer: 0, explanation: 'Atos relata que todos foram cheios do Espírito Santo e falaram conforme ele lhes concedia.', reference: 'Atos 2:1–4' },
    { id: 'c14q2', question: 'O que muitos fizeram após receber a palavra no dia de Pentecostes?', options: ['Foram batizados', 'Construíram uma muralha', 'Escolheram um faraó', 'Abandonaram Jerusalém em silêncio'], answer: 0, explanation: 'Atos relata que os que receberam a palavra foram batizados e se juntaram à comunidade.', reference: 'Atos 2:41–42' },
  ]},
  { id: 15, title: 'Viagens de Paulo', subtitle: 'O evangelho alcança outros povos', icon: '🧭', lessonTitle: 'Chamado para anunciar', questions: [
    { id: 'c15q1', question: 'Em qual cidade Paulo estava quando Jesus o confrontou no caminho?', options: ['A caminho de Damasco', 'A caminho de Belém', 'Em Roma diante de César', 'Em Jericó'], answer: 0, explanation: 'Saulo viajava para Damasco quando uma luz o cercou e ele ouviu a voz de Jesus.', reference: 'Atos 9:1–6' },
    { id: 'c15q2', question: 'Para qual obra o Espírito Santo separou Barnabé e Saulo?', options: ['Para reconstruir Jericó', 'Para a obra missionária anunciada em Atos', 'Para governar o Egito', 'Para escrever os Salmos'], answer: 1, explanation: 'A igreja em Antioquia os enviou para a obra para a qual haviam sido chamados.', reference: 'Atos 13:2–4' },
  ]},
  { id: 16, title: 'Cartas do Novo Testamento', subtitle: 'Ensino para a vida cristã', icon: '💌', lessonTitle: 'Praticar a palavra', questions: [
    { id: 'c16q1', question: 'Para que é útil toda a Escritura, segundo 2 Timóteo?', options: ['Apenas para debates', 'Para ensinar, repreender, corrigir e instruir em justiça', 'Somente para contar genealogias', 'Para prever cada detalhe do futuro'], answer: 1, explanation: 'A passagem descreve a utilidade da Escritura para ensinar e preparar para toda boa obra.', reference: '2 Timóteo 3:16–17' },
    { id: 'c16q2', question: 'Como 1 Coríntios 13 descreve o amor?', options: ['Impaciente e orgulhoso', 'Invejoso e rude', 'Paciente e bondoso', 'Interessado apenas em si mesmo'], answer: 2, explanation: 'Paulo descreve o amor como paciente e bondoso, sem inveja nem vanglória.', reference: '1 Coríntios 13:4–7' },
  ]},
];
