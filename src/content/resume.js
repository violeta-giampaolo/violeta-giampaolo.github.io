// The A4 resume letter (Harvard format). Edit freely — the layout follows.
// Experience is listed most recent first. Leave `place` empty to hide it.
export const resume = {
  name: 'Violeta Giampaolo',
  contact: ['Caracas, Venezuela', 'giampaolovioleta@gmail.com'],

  education: [
    {
      school: 'Universidad Católica Andrés Bello (UCAB)',
      place: 'Caracas, Venezuela',
      detail: 'Architecture — in progress',
    },
    {
      school: 'Mater Salvatoris School',
      place: 'Caracas, Venezuela',
      detail: 'High school diploma',
    },
  ],

  experience: [
    {
      company: 'Play Media',
      place: 'Caracas, Venezuela',
      role: 'Graphic Designer (Freelance)',
      bullets: [
        'Designed complete brand identities — symbol, typography, colour palette and visual system — for Play Media’s own identity and clients such as Sotavento, Ducarsil and Santo Stefano.',
        'Became a go-to designer for branding projects thanks to a distinct style and a sharp eye for detail.',
      ],
    },
    {
      company: 'Sign Agency (Sign Medios)',
      place: 'Caracas, Venezuela',
      role: 'Graphic Designer, Community Manager, Photo Retoucher & Animator',
      bullets: [
        'Hired as a graphic designer on a path toward the Head of Design role, within a small multidisciplinary team.',
        'Designed the new packaging and refreshed the menus for Arturo’s, a nationwide fast-food chain.',
        'Designed the rebrand of Krön, a chocolate brand sold across Venezuela, and produced a wide range of content for it.',
        'Designed graphic pieces and social media content for agency clients, and managed their communities.',
        'Retouched and edited photography and produced animated content for campaigns.',
      ],
    },
    {
      company: 'Econecta',
      place: 'Caracas, Venezuela',
      role: 'NFC Card Designer',
      bullets: [
        'Designed and produced NFC smart business cards for brands such as Rent A House and JAC, including the cards for the company’s rebranded leadership.',
        'Explored UV printing and laser engraving to develop new textures and finishes tailored to each brand.',
        'Created an original line of NFC card designs.',
      ],
    },
    {
      company: 'The Wave Studio',
      place: 'Caracas, Venezuela',
      role: 'Graphic Designer',
      bullets: [
        'Worked on four campaigns for YOLO, including out-of-home billboards displayed across Caracas.',
        'Designed packaging for Rupli’s new marshmallow line and an upcoming gummy candy.',
        'Contributed to campaign work for Pantera cereal.',
      ],
    },
    {
      company: 'ETC Proyectos',
      place: 'Caracas, Venezuela',
      role: 'Architecture Intern',
      bullets: ['Built a physical scale model of a residential project.'],
    },
    {
      company: 'La Elegancia Militar',
      place: 'Caracas, Venezuela',
      role: 'Designer & Fabricator',
      bullets: [
        'Designed and built from scratch a 50 cm LED-strip light sign of Venezuela’s coat of arms, learning electronics along the way.',
        'Designed and fabricated an LED-lit resin table featuring unclaimed military and police identification tags; took a resin course to execute it.',
      ],
    },
  ],

  skills: [
    { label: 'Design', value: 'Adobe Creative Suite (Illustrator, Photoshop, InDesign), Figma, Framer' },
    { label: 'Architecture & 3D', value: 'AutoCAD, ArchiCAD, SketchUp, Blender, Enscape' },
    { label: 'Making', value: 'Resin casting, LED lighting, UV printing, laser engraving, scale models' },
    { label: 'Languages', value: 'Spanish (native), English (C1–C2)' },
    {
      label: 'Learning',
      value: 'Largely self-taught; always teaching myself new tools — I believe every skill feeds the others.',
    },
    {
      label: 'Interests',
      value:
        'A lifelong multi-disciplinary learner: ballet, national dance and hip hop; painting and drawing; guitar and flute; swimming, volleyball and yoga; Arabic.',
    },
  ],
};
