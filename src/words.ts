export type WordCategoryKey = 'lithuanian' | 'lithuanianSlang'

export type WordCategory = {
  label: string
  words: string[]
}

export const wordCategories: Record<WordCategoryKey, WordCategory> = {
  lithuanian: {
    label: 'Lithuanian',
    words: [
      'Gitanas Nauseda',
      'Ingrida Simonyte',
      'Andrius Kubilius',
      'Viktorija Cmilyte-Nielsen',
      'Remigijus Zemaitaitis',
      'Giedra Beliauskaite',
      'Vytautas Kernagis',
      'Darius Meskauskas',
      'Erica Jennings',
      'Andrius Mamontovas',
      'Maybach',
      'Vileda',
      'Velava',
      'Laima',
      'Ruta',
      'Gediminas Tower',
      'Vilnius Cathedral',
      'Hill of Crosses',
      'Curonian Spit',
      'Nemunas River',
      'Baltic Sea',
      'Amber',
      'Rye bread',
      'Linen',
      'Sutartines',
      'Kryziai',
    ],
  },
  lithuanianSlang: {
    label: 'Lithuanian Slang',
    words: [
      'Bazaras',
      'Zjbs',
      'Ledas',
      'Kosmosas',
      'Nu ka',
      'Varom',
      'Afigienas',
      'Pazoras',
      'Seneliumbai',
      'Nesinervuok',
      'Skaniai suejo',
      'Reikalai',
      'Ciuju',
      'Aukstyn nosi',
      'Viskas ciki',
    ],
  },
}
