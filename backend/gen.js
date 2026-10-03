const fs = require('fs');

const raw = `Traveler's Gun
Value - 5,200
Evergun
Value - 3,450
Evergreen
Value - 2,675
Constellation
Value - 2,600
Alienbeam
Value - 1,900
Turkey
Value - 1,900
Vampire's Gun
Value - 1,900
Darkshot
Value - 1,800
Darksword
Value - 1,775
Raygun
Value - 1,775
Blossom
Value - 1,350
Sakura
Value - 1,340
Sunrise
Value - 1,050
Soul
Value - 680
Bauble
Value - 675
Snowcannon
Value - 675
Spirit
Value - 670
Sunset
Value - 650
Rainbow Gun
Value - 420
Flora
Value - 410
Rainbow
Value - 410
Xenoknife
Value - 405
Xenoshot
Value - 405
Bloom
Value - 400
Batwing
Value - 1,000,000
Black Luger
Value - 1,000,000
Heart Wand
Value - 340
Blizzard
Value - 300
Snowstorm
Value - 300
Ocean
Value - 265
Waves
Value - 260
Flowerwood Gun
Value - 245
Flowerwood
Value - 240
Snow Dagger
Value - 175
Icecream
Value - 155
Treat
Value - 155
Watergun
Value - 155
Sweet
Value - 150
Borealis
Value - 145
Australis
Value - 140
Bat
Value - 125
Beachy
Value - 90
Sands
Value - 90
Pearlshine
Value - 80
Candy
Value - 80
Pearl
Value - 75
Ornament
Value - 70
Heartblade
Value - 65
Phantom
Value - 35
Red Luger
Value - 35
Spectre
Value - 35
Candleflame
Value - 33
Darkbringer
Value - 33
Elderwood Blade
Value - 33
Elderwood Revolver
Value - 33
Iceblaster
Value - 33
Makeshift
Value - 33
Lightbringer
Value - 32
Sugar
Value - 32
Green Luger
Value - 23
Amerilaser
Value - 22
Laser
Value - 22
Hallowgun
Value - 20
Nightblade
Value - 20
Shark
Value - 20`;

const lines = raw.split('\n').map(l => l.trim()).filter(l => l);
const items = [];
let currentItem = {};
let id = 100;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('Value -')) {
    const valStr = lines[i].replace('Value -', '').trim().replace(/,/g, '');
    currentItem.supremeValue = parseInt(valStr);
    
    // Estimate starpets price for now
    currentItem.starpetsPrice = parseFloat((currentItem.supremeValue * 0.0035).toFixed(2));
    if (currentItem.starpetsPrice < 0.5) currentItem.starpetsPrice = 0.5;
    
    items.push(currentItem);
    currentItem = {};
  } else {
    currentItem = {
      id: String(id++),
      name: lines[i],
      category: 'Godlies',
      image: `generatePlaceholder('${lines[i].substring(0,3).toUpperCase()}', '#1f2937', '#111827')`
    };
  }
}

console.log(items.map(i => `{ id: '${i.id}', name: '${i.name}', category: 'Godlies', supremeValue: ${i.supremeValue}, starpetsPrice: ${i.starpetsPrice}, image: ${i.image} }`).join(',\n  '));
