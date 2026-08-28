import type { Dict } from './index';

const en: Dict = {
  meta: {
    title: 'David Villar Martos',
    description:
      'David Villar Martos — Mathematics, Artificial Intelligence and Data Science.',
  },
  nav: {
    logo: 'DAVID VILLAR MARTOS',
    about: 'About',
    experience: 'Experience',
    projects: 'Projects',
    teaching: 'Teaching',
    contact: 'Contact',
    toEs: 'Ver en español',
    toEn: 'View in English',
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
  },
  hero: {
    eyebrow: 'MATHEMATICS · AI · DATA SCIENCE',
    name: 'David<br />Villar Martos',
    intro:
      'Mathematics teacher, computer engineer, data scientist and AI enthusiast.',
    scroll: 'Scroll to explore',
  },
  about: {
    number: '01',
    label: 'ABOUT',
    heading: '<em>Curiosity</em> is the <em>starting point</em>.',
    paragraphs: [
      "I'm David — a mathematician, computer engineer, data scientist and teacher. I like learning new things, understanding how they fit together, and finding ways to turn that knowledge into something useful.",
      'Mathematics taught me how to think, computer science how to build, and data science and AI how to find patterns and meaning in complex systems. Teaching has given me the chance to share all of it — and to discover that a hard idea can become a simple one once you find the right way to explain it.',
      'Outside the classroom, I enjoy taking these ideas elsewhere: experimenting with data, designing games and building interactive experiences.',
    ],
    closing:
      'In the end, it all comes down to the same thing:<br /> <em>understand, build and share.</em>',
    caption: 'DAVID VILLAR MARTOS',
    photoAlt: 'David Villar Martos',
  },
  experience: {
    number: '02',
    label: 'EXPERIENCE',
    heading: 'A path through <em>knowledge.</em>',
    intro:
      'Mathematics, computing, AI, teaching... building a global, interconnected view across them.',
    items: [
      {
        year: '2016-2021',
        type: 'EDUCATION - MATHEMATICS',
        title: "Bachelor's Degree in Mathematics (UGR)",
        body: 'Where I developed a way of thinking rooted in logical reasoning, abstraction and problem solving, building a solid foundation in analysis, algebra, geometry, probability, statistics and applied mathematics.',
      },
      {
        year: '2016-2021',
        type: 'EDUCATION - COMPUTER SCIENCE',
        title:
          "Bachelor's Degree in Computer Engineering, specialising in Computation and Intelligent Systems (UGR)",
        body: 'Where I learned about computation, programming, algorithmics, computational thinking, metaheuristics, computer vision and machine learning, complementing my mathematical training with a computational perspective aimed at solving complex problems.',
      },
      {
        year: '2022-2023',
        type: 'EDUCATION - TEACHING',
        title:
          "Master's in Secondary Education, specialising in Mathematics (UGR)",
        body: 'Where I went deeper into developmental and learning psychology, the didactics of mathematics, assessment, and the design of activities and resources, putting it all into practice during my training placement at a secondary school.',
      },
      {
        year: '2021-2024',
        type: 'EDUCATION - AI & DATA SCIENCE',
        title:
          "Master's in Data Science and Computer Engineering, specialising in Data Science and Intelligent Technologies (UGR)",
        body: 'Where I went deeper into data science and mining, Big Data, social network analysis, process mining and probabilistic models, consolidating my background in artificial intelligence and data analysis. I received top honours for my Master\'s Thesis: "Development of Fair Machine Learning Algorithms Based on Decision Trees".',
      },
      {
        year: '2021-2023',
        type: 'WORK - RESEARCH',
        title: 'Data Scientist and Project-Funded Researcher',
        body: 'I worked as lead developer on the project "Assessing the care needs of people with chronic illnesses according to social and environmental determinants using advanced data science methodologies", applying data science techniques to a real problem with social impact.',
      },
      {
        year: '2025 - PRESENT',
        type: 'WORK - TEACHING',
        title: 'Mathematics Teacher in Public Secondary Education',
        body: 'My day-to-day in the classroom has taught me to turn complex ideas into accessible learning experiences, adapt to different paces and needs, and manage an environment where communication, organisation and flexibility are essential.',
      },
    ],
  },
  projects: {
    number: '03',
    label: 'PROJECTS',
    heading: 'Turning <em>ideas</em> into <em>reality</em>.',
    intro:
      'A selection of projects, experiments and ideas around teaching, data, AI and interactive systems.',
    disciplines: {
      math: 'MATHEMATICS',
      ai: 'ARTIFICIAL<br />INTELLIGENCE',
      games: 'GAME<br />DEVELOPMENT',
    },
    viewOnGithub: 'View on GitHub',
    exploreTeaching: 'Explore teaching',
    comingSoon: {
      kicker: 'GAME DEVELOPMENT',
      title: "It's getting<br /> closer.",
      meta: 'Godot · Strategy · Collecting',
    },
    mathPlaceholder: 'MATHEMATICS',
    items: [
      {
        category: 'DATA SCIENCE · AI · MACHINE LEARNING',
        title: 'Building a <em>fairer world.</em>',
        subtitle:
          'Development of Fair Machine Learning Models Based on Decision Trees.',
        description:
          "Master's thesis (with honours) in which I built machine learning models that account for the bias in their predictions and minimise it while they learn, using multi-objective optimisation, decision trees and genetic algorithms.",
        galleryAlt: 'Fair machine learning models',
      },
      {
        category: 'DATA SCIENCE · AI · COMPUTER VISION',
        title: 'Finding patterns in<br /> <em>what we like.</em>',
        subtitle: 'Pokémon Data Science',
        description:
          'A data science project covering data collection, exploratory analysis, clustering and image classification using deep learning and feature extraction.',
        galleryAlt: 'Pokémon Data Science',
      },
      {
        category: 'AI · DEEP LEARNING · COMPUTER VISION',
        title: 'Identifying <em>and fighting disease</em>.',
        subtitle:
          'Chest X-ray Classification for COVID-19 Detection and Differentiation from Other Viral Pneumonias Using CNNs.',
        description:
          'A project showing the potential of AI as a support system for medical decision-making and for identifying and distinguishing diseases.',
        galleryAlt: 'Chest X-ray classification with CNNs',
      },
      {
        category: 'MATHEMATICS · VISUALISATION',
        title: 'Exploring<br /> <em>mathematical ideas.</em>',
        subtitle: 'A whole world',
        description:
          'My mathematics project takes shape in the classroom, where every student learns from it and adds to it.',
        galleryAlt: '',
      },
      {
        category: 'GAME DEVELOPMENT',
        title: 'Building<br /> <em>interactive worlds.</em>',
        subtitle: 'An unannounced game',
        description:
          'A personal project exploring the limits of strategy and collecting.',
        galleryAlt: '',
      },
    ],
  },
  teaching: {
    number: '04',
    label: 'TEACHING',
    heading: 'Turning <em>curiosity</em> into <em>understanding</em>.',
    intro:
      "I believe in high-quality public education for everyone — education that makes the most of each person's abilities, with nothing mattering more than their own desire to reach their goals. Here are a few brushstrokes of my philosophy as a teacher:",
    principles: [
      {
        number: '01',
        label: 'WANTING TO KNOW',
        title: 'Start with <em>questions.</em>',
        paragraphs: [
          'I always begin by asking something seemingly simple, because the best learning happens when curiosity is sparked — situations that motivate intrinsically and mobilise every prior mathematical idea rather than just adding new ones. Experimenting, making conjectures, spotting patterns... it all grows from that motivation.',
          'Sometimes the most valuable part of teaching and learning lies in how to ask better questions.',
        ],
      },
      {
        number: '02',
        label: 'WANTING TO KNOW HOW',
        title: 'Widen <em>horizons.</em>',
        paragraphs: [
          'Mathematics is full of concepts and relationships that are hard to see at first but become clear once we understand them. There are many ways to make the abstract concrete: visualising, connecting, observing, manipulating... Technology also plays a big part in letting students reason and build their own knowledge.',
          'Mathematics unlocks new ways to think, reason and understand the reality around us.',
        ],
      },
      {
        number: '03',
        label: 'WANTING TO KNOW HOW TO BE',
        title: 'From the <em>heart.</em>',
        paragraphs: [
          'Life has taught me that what matters most is the people around us, and I could feel no greater pride than working in education and watching them grow. I try to share my view of the world and leave a mark on each person, to live on in their memory and shape them positively so they can live better.',
          'It is not about being happy at the end, but about valuing all the happiness there is along the way.',
        ],
      },
    ],
    closingLabel: 'TO TEACH IS',
    closingText:
      'To awaken curiosity, make the abstract visible, and walk with each person as they discover new ways to think, understand and enjoy the process of learning.',
  },
  contact: {
    number: '05',
    label: 'CONTACT',
    heading: "Let's build <em>together</em>",
    body: "Whether it's mathematics, technology, education, AI, data science or game development.",
    cta: 'Get in touch',
    email: 'villarmartosdavid@gmail.com',
  },
  footer: {
    tagline: 'MATHEMATICS · AI · DATA SCIENCE',
    rights: '© 2026 David Villar Martos',
    github: 'GitHub',
    linkedin: 'LinkedIn',
    email: 'Email',
  },
  gallery: {
    prev: 'Previous image',
    next: 'Next image',
    goTo: 'Go to image',
  },
};

export default en;
