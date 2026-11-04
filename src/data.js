export const drawDetails = {
  drawNumber: '5TH ANNIVERSARY',
  eventName: '5th Anniversary Staff Party · JASMINE TAUNGGYI HOTEL',
}

const prizeMedia = Object.entries(import.meta.glob('./assets/images/[0-9][0-9][0-9]*.*', {
  eager: true,
  query: '?url',
  import: 'default',
})).reduce((images, [path, url]) => {
  const match = path.match(/\/(\d{3})(?:-(\d+))?\.([^/]+)$/)
  const ticketNumber = match?.[1]
  if (ticketNumber) {
    const extension = match[3].toLowerCase()
    const updatedAt = Number(match[2] ?? 0)
    if (!images[ticketNumber] || updatedAt > images[ticketNumber].updatedAt) {
      images[ticketNumber] = {
        src: url,
        type: ['mp4', 'mov', 'webm'].includes(extension) ? 'video' : 'image',
        updatedAt,
      }
    }
  }
  return images
}, {})

const entriesWithoutImages = [
  ['001', 'Air Fryer ( 5L )'],
  ['002', 'အဝတ်ခြောက်ခံစက် အသေး'],
  ['003', 'Tumber ( Seagull Brand )'],
  ['004', 'အဝတ်လျှော်စက်အသေး'],
  ['005', 'Processor (အသားကြိတ်စက်)'],
  ['006', 'Hair Dryer'],
  ['007', 'Motor Cycle'],
  ['008', 'Ear Plug'],
  ['009', 'Electronic Kettle'],
  ['010', 'ရွှေစုပြား'],
  ['011', 'ရွှေလက်စွပ်'],
  ['012', 'Hair Dryer'],
  ['013', 'Speaker'],
  ['014', 'Rice Cooker'],
  ['015', 'Speaker'],
  ['016', 'Pressure Cooker ( 5 in 1 )'],
  ['017', 'Hair Dryer'],
  ['018', 'Portable Pot'],
  ['019', 'Blanket'],
  ['020', 'Ear Plug'],
  ['021', 'Pressure Cooker ( 5 in 1 )'],
  ['022', 'ရွှေလက်စွပ်'],
  ['023', 'Champagne Chair'],
  ['024', 'Processor (အသားကြိတ်စက်)'],
  ['025', 'Electronic Kettle'],
  ['026', 'Head Ear Phone'],
  ['027', 'Fast Cooker'],
  ['028', 'ရွှေစုပြား'],
  ['029', 'Tumber ( Seagull Brand )'],
  ['030', 'Spa Ticket'],
  ['031', 'Fan FA'],
  ['032', 'Blanket'],
  ['033', 'ရွှေလက်စွပ်'],
  ['034', 'Fan RS'],
  ['035', 'အဝတ်လျှော်စက်အသေး'],
  ['036', 'Power Bank'],
  ['037', 'Mini Blender'],
  ['038', 'Hair Dryer'],
  ['039', 'Fan DF'],
  ['040', 'Power Bank'],
  ['041', 'Fan FA'],
  ['042', 'အဝတ်လျှော်စက်အသေး'],
  ['043', 'Fast Cooker'],
  ['044', 'ရွှေလက်စွပ်'],
  ['045', 'Speaker'],
  ['046', 'Blender (အသီးဖျော်စက်)'],
  ['047', 'Fan FA'],
  ['048', 'Head Ear Phone'],
  ['049', 'Ear Plug'],
  ['050', 'Head Ear Phone'],
  ['051', 'Pressure Cooker ( 5 in 1 )'],
  ['052', 'Ear Plug'],
  ['053', 'အကင်အိုး'],
  ['054', 'Champagne Chair'],
  ['055', 'Watch (DM9577131) Danis Martin'],
  ['056', 'Champagne Chair'],
  ['057', 'Blender (အသီးဖျော်စက်)'],
  ['058', 'Champagne Chair'],
  ['059', 'Air Wrap (ဆံပင်ပုံသွင်းစက် 2 in 1)'],
  ['060', 'Processor (အသားကြိတ်စက်)'],
  ['061', 'Ear Plug'],
  ['062', 'Blanket'],
  ['063', 'Tumber ( Seagull Brand )'],
  ['064', 'Casio Watch (1A)'],
  ['065', 'Champagne Chair'],
  ['066', 'Heater'],
  ['067', 'Casio Watch (9A)'],
  ['068', 'Portable Gas Stove'],
  ['069', 'Pressure Cooker အသားပေါင်းအိုး'],
  ['070', 'Portable Gas Stove'],
  ['071', 'Mini Blender'],
  ['072', 'Portable Gas Stove'],
  ['073', 'Electronic Kettle'],
  ['074', 'Mini Blender'],
  ['075', 'Tumber ( Seagull Brand )'],
  ['076', 'အဝတ်ခြောက်ခံစက် အသေး'],
  ['077', 'Heater'],
  ['078', 'Power Bank'],
  ['079', 'Casio Watch (7A)'],
  ['080', 'Spa Ticket'],
  ['081', 'Portable Pot'],
  ['082', 'အကင်အိုး'],
  ['083', 'Portable Gas Stove'],
  ['084', 'အကင်အိုး'],
  ['085', 'Spa Ticket'],
  ['086', 'အဝတ်လျှော်စက်အသေး'],
  ['087', 'Blender (အသီးဖျော်စက်)'],
  ['088', 'Red Mi 15 C'],
  ['089', 'အကင်အိုး'],
  ['090', 'Hair Dryer'],
  ['091', 'ဖုန်စုပ်စက်'],
  ['092', 'Portable Gas Stove'],
  ['093', 'အဝတ်လျှော်စက်အသေး'],
  ['094', 'Mini Blender'],
  ['095', 'Blanket'],
  ['096', 'Air Wrap (ဆံပင်ပုံသွင်းစက် 2 in 1)'],
  ['097', 'Blanket'],
  ['098', 'Spa Ticket'],
  ['099', 'Red Mi 17'],
  ['100', 'ရွှေစုပြား'],
  ['101', 'Tumber ( Seagull Brand )'],
  ['102', 'Air Wrap (ဆံပင်ပုံသွင်းစက် 2 in 1)'],
  ['103', 'Mini Blender'],
  ['104', 'ဖုန်စုပ်စက်'],
  ['105', 'Casio Watch (7B)'],
  ['106', 'ဖုန်စုပ်စက်'],
  ['107', 'Pressure Cooker အသားပေါင်းအိုး'],
  ['108', 'အကင်အိုး'],
  ['109', 'Tumber ( Seagull Brand )'],
  ['110', 'ရွှေစုပြား'],
  ['111', 'Osmo Pocket 3'],
]

const imageByItemName = new Map()
for (const [ticketNumber, itemName] of entriesWithoutImages) {
  const media = prizeMedia[ticketNumber]
  if (media && !imageByItemName.has(itemName)) {
    imageByItemName.set(itemName, media)
  }
}

export const entries = entriesWithoutImages.map(([ticketNumber, itemName]) => ({
  ticketNumber,
  itemName,
  media: prizeMedia[ticketNumber] ?? imageByItemName.get(itemName) ?? null,
}))
