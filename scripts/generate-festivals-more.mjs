/**
 * Generates src/data/festivals-more.ts from compact rows.
 * Run: node scripts/generate-festivals-more.mjs
 */
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const imgs = [
  "1470229722913-7c0e2dbbafd3",
  "1516834611397-8d633eaec5d0",
  "1529156069898-49953e39b3ac",
  "1533174072545-7a4b6ad7a6c3",
  "1507838153414-b4b713384a76",
  "1519677100203-a0e668c92439",
  "1499377193864-82682aefed04",
  "1467269204594-9661b134dd2b",
  "1516307365426-bea591f05011",
  "1492684223066-81342ee5ff30"
];
let imgI = 0;
function pickImg() {
  const id = imgs[imgI % imgs.length];
  imgI++;
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** When the display name would change the slug, pin the stable catalog id (manual copy / media). */
const SLUG_ID_OVERRIDES = {
  "festa-ta-san-georg-victoria-gozo": "feast-of-st-george-victoria-gozo"
};

/** Display titles for rows in this file only (`festivals-more.ts`). Core `festivals.ts` ids are unchanged here. */
const DISPLAY_NAME_BY_ID = {
  "feast-of-st-george-victoria-gozo": "Festa ta' San Ġorġ — Victoria, Gozo",
  "romaria-de-viana-do-castelo": "Romaria de Nossa Senhora d'Agonia — Viana do Castelo",
  "patios-de-cordoba-festival": "Fiesta de los Patios — Córdoba",
  "hogueras-de-alicante": "San Juan Bonfires (Hogueras) — Alicante",
  "santa-cruz-de-tenerife-carnival": "Carnaval de Tenerife — Santa Cruz",
  "midsummer": "Swedish Midsummer",
  "cologne-carnival": "Cologne Karneval",
  "apokries-carnival": "Patras Carnival (Apokries)",
  "surva-festival": "Surva (Kukeri) — Pernik",
  "bastille-day-celebrations": "Bastille Day — Paris",
  "nice-carnival": "Carnaval de Nice",
  "fete-de-la-musique-paris": "Fête de la Musique — Paris",
  "festival-d-avignon": "Festival d'Avignon",
  "fete-du-citron": "Menton Lemon Festival (Fête du Citron)",
  "viareggio-carnival": "Carnevale di Viareggio",
  "ommegang-festival": "Ommegang — Brussels",
  "sanziene-festival": "Sânziene Festival",
  "ligo-festival-riga": "Līgo — Riga",
  "thorrablot-reykjavik": "Þorrablót — Reykjavík",
  "perchtenlauf-salzburg": "Perchtenlauf — Salzburg",
  "krampusnacht": "Krampusnacht — Austria",
  "exit-festival": "EXIT Festival — Novi Sad",
  "sziget-festival": "Sziget Festival — Budapest",
  "untold-festival": "Untold Festival — Cluj-Napoca",
  "kurentovanje": "Kurentovanje — Ptuj",
  "sechselauten": "Sechseläuten — Zürich",
  "fete-de-l-escalade": "Fête de l'Escalade — Geneva",
  "palio-di-siena": "Palio di Siena"
};

/** name, city, country, continent, lat, lng, start, end, types (| sep), pe, vs, cd, td, bestFor (comma sep using canonical tags) */
const rows = [
  ["Edinburgh Fringe Festival", "Edinburgh", "United Kingdom", "Europe", 55.9533, -3.1883, "2026-08-07", "2026-08-31", "arts|music", 4, 5, 4, 5, "Music lovers|Summer travel|Art and design"],
  ["Hogmanay", "Edinburgh", "United Kingdom", "Europe", 55.9533, -3.1883, "2026-12-31", "2027-01-01", "civic_national_holiday|cultural_heritage", 5, 5, 4, 5, "Winter travel|Group trips|Street celebrations"],
  ["Bastille Day Celebrations", "Paris", "France", "Europe", 48.8566, 2.3522, "2026-07-14", "2026-07-14", "civic_national_holiday|cultural_heritage", 4, 5, 4, 4, "Summer travel|Photography|Romantic getaway"],
  ["Cannes Film Festival", "Cannes", "France", "Europe", 43.5528, 7.0174, "2026-05-12", "2026-05-23", "arts", 3, 4, 3, 5, "Luxury travel|Art and design|Summer travel"],
  ["Nice Carnival", "Nice", "France", "Europe", 43.7102, 7.262, "2026-02-13", "2026-02-28", "carnival_parade|cultural_heritage", 4, 5, 4, 4, "Street celebrations|Photography|Winter travel"],
  ["Regata Storica", "Venice", "Italy", "Europe", 45.4408, 12.3155, "2026-08-30", "2026-09-06", "historical|cultural_heritage", 3, 5, 5, 4, "Traditional heritage|Romantic getaway|Cultural immersion"],
  ["Palio di Siena", "Siena", "Italy", "Europe", 43.3188, 11.3317, "2026-07-02", "2026-08-16", "historical|cultural_heritage", 4, 5, 5, 4, "Adrenaline seekers|Traditional heritage|Group trips"],
  ["Festa della Sensa", "Venice", "Italy", "Europe", 45.4408, 12.3155, "2026-05-24", "2026-05-24", "religious_spiritual|historical", 2, 4, 5, 3, "Religious significance|Traditional heritage|Cultural immersion"],
  ["Fiesta de San Isidro", "Madrid", "Spain", "Europe", 40.4168, -3.7038, "2026-05-15", "2026-05-15", "civic_national_holiday|cultural_heritage", 4, 4, 4, 4, "Street celebrations|Music lovers|Summer travel"],
  ["Festival Interceltique de Lorient", "Lorient", "France", "Europe", 47.7483, -3.3702, "2026-08-07", "2026-08-16", "music|cultural_heritage", 4, 4, 5, 3, "Music lovers|Cultural immersion|Group trips"],
  ["Obby Oss Festival", "Padstow", "United Kingdom", "Europe", 50.5388, -4.9514, "2026-05-01", "2026-05-01", "seasonal|cultural_heritage", 4, 4, 5, 3, "Traditional heritage|Local authenticity|Street celebrations"],
  ["Cheese Rolling Festival", "Gloucester", "United Kingdom", "Europe", 51.8642, -2.2382, "2026-05-25", "2026-05-25", "seasonal|cultural_heritage", 5, 3, 3, 4, "Adrenaline seekers|Group trips|Weekend getaway"],
  ["Guy Fawkes Night", "London", "United Kingdom", "Europe", 51.5074, -0.1278, "2026-11-05", "2026-11-05", "civic_national_holiday|historical", 3, 5, 3, 4, "Photography|Winter travel|Family-friendly"],
  ["Isle of Man TT", "Douglas", "Isle of Man", "Europe", 54.15, -4.48, "2026-05-29", "2026-06-12", "seasonal", 5, 4, 2, 4, "Adrenaline seekers|Summer travel|Group trips"],
  ["Pukkelpop", "Hasselt", "Belgium", "Europe", 50.9307, 5.3378, "2026-08-20", "2026-08-23", "music", 5, 4, 2, 4, "Music lovers|Summer travel|Group trips"],
  ["Ommegang Festival", "Brussels", "Belgium", "Europe", 50.8467, 4.3525, "2026-07-02", "2026-07-05", "historical|carnival_parade", 3, 5, 5, 3, "Traditional heritage|Cultural immersion|Photography"],
  ["Gentse Feesten", "Ghent", "Belgium", "Europe", 51.0543, 3.7174, "2026-07-17", "2026-07-26", "music|carnival_parade", 5, 4, 3, 4, "Nightlife|Street celebrations|Summer travel"],
  ["Maastricht Carnival", "Maastricht", "Netherlands", "Europe", 50.8514, 5.6909, "2026-03-02", "2026-03-04", "carnival_parade", 4, 4, 3, 3, "Street celebrations|Group trips|Winter travel"],
  ["Rotterdam Summer Carnival", "Rotterdam", "Netherlands", "Europe", 51.9244, 4.4777, "2026-07-26", "2026-07-26", "carnival_parade|music", 5, 5, 3, 4, "Street celebrations|Summer travel|Music lovers"],
  ["Zundert Flower Parade", "Zundert", "Netherlands", "Europe", 51.4717, 4.6558, "2026-09-06", "2026-09-06", "seasonal|cultural_heritage", 2, 5, 3, 3, "Photography|Art and design|Traditional heritage"],
  ["Valkenburg Christmas Markets", "Valkenburg", "Netherlands", "Europe", 50.865, 5.832, "2026-11-28", "2026-12-23", "seasonal|food_drink", 3, 4, 3, 4, "Winter travel|Romantic getaway|Food travel"],
  ["Vienna Ball Season", "Vienna", "Austria", "Europe", 48.2082, 16.3738, "2026-01-15", "2026-02-25", "arts|cultural_heritage", 2, 5, 4, 4, "Luxury travel|Romantic getaway|Traditional heritage"],
  ["Salzburg Festival", "Salzburg", "Austria", "Europe", 47.8095, 13.055, "2026-07-18", "2026-08-31", "arts|music", 2, 5, 5, 4, "Music lovers|Cultural immersion|Luxury travel"],
  ["Krampusnacht", "Salzburg", "Austria", "Europe", 47.8095, 13.055, "2026-12-05", "2026-12-05", "religious_spiritual|seasonal", 3, 5, 4, 3, "Winter travel|Traditional heritage|Cultural immersion"],
  ["Almabtrieb", "Garmisch-Partenkirchen", "Germany", "Europe", 47.4925, 11.0958, "2026-09-10", "2026-09-30", "seasonal|cultural_heritage", 3, 4, 4, 3, "Traditional heritage|Food travel|Local authenticity"],
  ["Sechselauten", "Zurich", "Switzerland", "Europe", 47.3769, 8.5417, "2026-04-13", "2026-04-20", "historical|seasonal", 3, 4, 4, 3, "Traditional heritage|Weekend getaway|Cultural immersion"],
  ["Fete de l'Escalade", "Geneva", "Switzerland", "Europe", 46.2044, 6.1432, "2026-12-11", "2026-12-13", "historical|civic_national_holiday", 2, 3, 5, 3, "Traditional heritage|Winter travel|Family-friendly"],
  ["Prague Christmas Markets", "Prague", "Czech Republic", "Europe", 50.0755, 14.4378, "2026-11-28", "2026-12-24", "seasonal|food_drink", 3, 5, 3, 5, "Winter travel|Romantic getaway|Food travel"],
  ["Signal Festival", "Prague", "Czech Republic", "Europe", 50.0755, 14.4378, "2026-10-16", "2026-10-19", "arts", 2, 5, 3, 4, "Art and design|Photography|Nightlife"],
  ["Bohemian Carnevale", "Prague", "Czech Republic", "Europe", 50.0755, 14.4378, "2026-02-14", "2026-02-17", "carnival_parade", 4, 5, 3, 4, "Street celebrations|Winter travel|Photography"],
  ["Krakow Wianki Festival", "Krakow", "Poland", "Europe", 50.0647, 19.945, "2026-06-20", "2026-06-21", "seasonal|cultural_heritage", 4, 4, 4, 3, "Summer travel|Romantic getaway|Traditional heritage"],
  ["St. Dominic's Fair", "Gdansk", "Poland", "Europe", 54.352, 18.6466, "2026-07-25", "2026-08-16", "civic_national_holiday|food_drink", 3, 4, 3, 4, "Food travel|Summer travel|Family-friendly"],
  ["Jewish Culture Festival", "Krakow", "Poland", "Europe", 50.0647, 19.945, "2026-06-26", "2026-07-04", "cultural_heritage|music", 2, 3, 5, 3, "Cultural immersion|Music lovers|Traditional heritage"],
  ["Pierogi Festival", "Krakow", "Poland", "Europe", 50.0647, 19.945, "2026-08-14", "2026-08-18", "food_drink", 3, 3, 4, 3, "Food travel|Local authenticity|Budget-friendly"],
  ["Lajkonik Parade", "Krakow", "Poland", "Europe", 50.0647, 19.945, "2026-06-11", "2026-06-11", "historical|carnival_parade", 3, 4, 5, 3, "Traditional heritage|Cultural immersion|Photography"],
  ["Sziget Festival", "Budapest", "Hungary", "Europe", 47.4979, 19.0402, "2026-08-12", "2026-08-17", "music", 5, 5, 3, 5, "Music lovers|Summer travel|Nightlife"],
  ["Vychodna Folklore Festival", "Vychodna", "Slovakia", "Europe", 49.017, 19.285, "2026-07-02", "2026-07-04", "music|cultural_heritage", 4, 4, 5, 2, "Cultural immersion|Traditional heritage|Music lovers"],
  ["Kurentovanje", "Ptuj", "Slovenia", "Europe", 46.4199, 15.8697, "2026-02-14", "2026-02-17", "carnival_parade|cultural_heritage", 4, 5, 4, 3, "Street celebrations|Winter travel|Traditional heritage"],
  ["Dragon Carnival", "Ljubljana", "Slovenia", "Europe", 46.0569, 14.5058, "2026-02-21", "2026-02-21", "carnival_parade", 4, 4, 3, 3, "Family-friendly|Street celebrations|Winter travel"],
  ["Advent Zagreb", "Zagreb", "Croatia", "Europe", 45.815, 15.9819, "2026-11-30", "2026-12-31", "seasonal|cultural_heritage", 3, 5, 3, 3, "Winter travel|Food travel|Family-friendly"],
  ["Sinjska Alka", "Sinj", "Croatia", "Europe", 43.7033, 16.4394, "2026-08-09", "2026-08-11", "historical|cultural_heritage", 3, 4, 5, 2, "Traditional heritage|Adrenaline seekers|Cultural immersion"],
  ["Dubrovnik Summer Festival", "Dubrovnik", "Croatia", "Europe", 42.6507, 18.0944, "2026-07-10", "2026-08-25", "arts|music", 2, 5, 5, 4, "Summer travel|Cultural immersion|Luxury travel"],
  ["Untold Festival", "Cluj-Napoca", "Romania", "Europe", 46.7712, 23.6236, "2026-08-06", "2026-08-09", "music", 5, 5, 2, 4, "Music lovers|Nightlife|Summer travel"],
  ["George Enescu Festival", "Bucharest", "Romania", "Europe", 44.4268, 26.1025, "2026-08-28", "2026-09-27", "music|arts", 2, 5, 5, 3, "Music lovers|Cultural immersion|Luxury travel"],
  ["Sanziene Festival", "Bucharest", "Romania", "Europe", 44.4268, 26.1025, "2026-06-24", "2026-06-24", "seasonal|cultural_heritage", 3, 4, 5, 2, "Summer travel|Traditional heritage|Romantic getaway"],
  ["Rose Festival", "Kazanlak", "Bulgaria", "Europe", 42.6186, 25.3936, "2026-05-30", "2026-06-05", "seasonal|cultural_heritage", 3, 5, 4, 2, "Summer travel|Photography|Romantic getaway"],
  ["Surva Festival", "Pernik", "Bulgaria", "Europe", 42.6051, 23.0378, "2026-01-24", "2026-01-26", "cultural_heritage", 3, 5, 5, 2, "Traditional heritage|Winter travel|Photography"],
  ["EXIT Festival", "Novi Sad", "Serbia", "Europe", 45.2671, 19.8335, "2026-07-09", "2026-07-12", "music", 5, 5, 2, 4, "Music lovers|Summer travel|Nightlife"],
  ["Belgrade Beer Fest", "Belgrade", "Serbia", "Europe", 44.7866, 20.4489, "2026-08-13", "2026-08-16", "food_drink|music", 5, 4, 2, 4, "Food travel|Nightlife|Summer travel"],
  ["Kotor Carnival", "Kotor", "Montenegro", "Europe", 42.4247, 18.7712, "2026-02-23", "2026-02-26", "carnival_parade", 4, 4, 3, 3, "Street celebrations|Romantic getaway|Winter travel"],
  ["Sea Dance Festival", "Budva", "Montenegro", "Europe", 42.2864, 18.8498, "2026-08-28", "2026-08-30", "music", 5, 4, 2, 4, "Music lovers|Summer travel|Nightlife"],
  ["Vyshyvanka Day", "Kyiv", "Ukraine", "Europe", 50.4501, 30.5234, "2026-05-21", "2026-05-21", "civic_national_holiday|cultural_heritage", 2, 4, 5, 2, "Cultural immersion|Traditional heritage|Photography"],
  ["Ivan Kupala Night", "Kyiv", "Ukraine", "Europe", 50.4501, 30.5234, "2026-07-06", "2026-07-07", "seasonal|religious_spiritual", 4, 4, 5, 2, "Summer travel|Traditional heritage|Romantic getaway"],
  ["White Nights Festival", "Saint Petersburg", "Russia", "Europe", 59.9343, 30.3351, "2026-05-21", "2026-07-21", "arts|music", 3, 5, 5, 4, "Summer travel|Cultural immersion|Romantic getaway"],
  ["Maslenitsa", "Moscow", "Russia", "Europe", 55.7558, 37.6173, "2026-02-23", "2026-03-01", "seasonal|cultural_heritage", 4, 4, 5, 3, "Winter travel|Food travel|Traditional heritage"],
  ["Scarlet Sails", "Saint Petersburg", "Russia", "Europe", 59.9343, 30.3351, "2026-06-20", "2026-06-21", "civic_national_holiday|arts", 4, 5, 3, 4, "Summer travel|Romantic getaway|Photography"],
  ["Song and Dance Celebration", "Tallinn", "Estonia", "Europe", 59.437, 24.7536, "2026-07-03", "2026-07-06", "cultural_heritage|music", 3, 5, 5, 3, "Cultural immersion|Traditional heritage|Summer travel"],
  ["Kaziukas Fair", "Vilnius", "Lithuania", "Europe", 54.6872, 25.2797, "2026-03-06", "2026-03-08", "civic_national_holiday|food_drink", 3, 4, 4, 3, "Food travel|Street celebrations|Winter travel"],
  ["Tallinn Medieval Days", "Tallinn", "Estonia", "Europe", 59.437, 24.7536, "2026-07-10", "2026-07-12", "historical|cultural_heritage", 2, 4, 5, 3, "Traditional heritage|Family-friendly|Summer travel"],
  ["Sauna Day", "Helsinki", "Finland", "Europe", 60.1699, 24.9384, "2026-06-27", "2026-06-27", "seasonal|cultural_heritage", 2, 2, 4, 2, "Local authenticity|Summer travel|Solo travelers"],
  ["Madeira Carnival", "Funchal", "Portugal", "Europe", 32.6669, -16.9241, "2026-02-14", "2026-02-18", "carnival_parade", 4, 5, 3, 4, "Street celebrations|Winter travel|Photography"],
  ["Festa de Sao Joao", "Porto", "Portugal", "Europe", 41.1579, -8.6291, "2026-06-23", "2026-06-24", "seasonal|civic_national_holiday", 5, 4, 4, 4, "Street celebrations|Summer travel|Nightlife"],
  ["Holy Week Braga", "Braga", "Portugal", "Europe", 41.5454, -8.4265, "2026-03-29", "2026-04-05", "religious_spiritual", 2, 5, 5, 3, "Religious significance|Traditional heritage|Cultural immersion"],
  ["Sardine Festival", "Portimao", "Portugal", "Europe", 37.1345, -8.5372, "2026-08-07", "2026-08-11", "food_drink|seasonal", 4, 4, 3, 3, "Food travel|Summer travel|Street celebrations"],
  ["Isle of MTV Malta", "Floriana", "Malta", "Europe", 35.8917, 14.5056, "2026-07-16", "2026-07-18", "music", 5, 4, 2, 5, "Music lovers|Summer travel|Nightlife"],
  ["Feast of St. Paul's Shipwreck", "Valletta", "Malta", "Europe", 35.8989, 14.5146, "2026-02-10", "2026-02-10", "religious_spiritual", 2, 3, 5, 3, "Religious significance|Cultural immersion|Romantic getaway"],
  ["Greek Orthodox Easter", "Athens", "Greece", "Europe", 37.9838, 23.7275, "2026-04-10", "2026-04-13", "religious_spiritual|seasonal", 2, 4, 5, 4, "Religious significance|Cultural immersion|Family-friendly"],
  ["Apokries Carnival", "Patras", "Greece", "Europe", 38.2466, 21.7346, "2026-02-15", "2026-02-22", "carnival_parade", 5, 5, 3, 3, "Street celebrations|Winter travel|Nightlife"],
  ["Athens Epidaurus Festival", "Athens", "Greece", "Europe", 37.9838, 23.7275, "2026-06-01", "2026-08-31", "arts|music", 2, 5, 5, 4, "Cultural immersion|Summer travel|Traditional heritage"],
  ["Midsummer", "Stockholm", "Sweden", "Europe", 59.3293, 18.0686, "2026-06-19", "2026-06-20", "seasonal|cultural_heritage", 4, 4, 5, 3, "Summer travel|Traditional heritage|Romantic getaway"],
  ["Saint Lucia Festival", "Helsinki", "Finland", "Europe", 60.1699, 24.9384, "2026-12-13", "2026-12-13", "religious_spiritual|seasonal", 2, 5, 4, 2, "Winter travel|Cultural immersion|Family-friendly"],
  ["Crayfish Parties", "Stockholm", "Sweden", "Europe", 59.3293, 18.0686, "2026-08-07", "2026-08-15", "food_drink|seasonal", 3, 3, 3, 2, "Food travel|Summer travel|Local authenticity"],
  ["Air Guitar World Championships", "Oulu", "Finland", "Europe", 65.0121, 25.4651, "2026-08-26", "2026-08-28", "music", 5, 4, 2, 3, "Music lovers|Summer travel|Adrenaline seekers"],
  ["Wife Carrying Championships", "Sonkajarvi", "Finland", "Europe", 63.8667, 26.6167, "2026-07-03", "2026-07-04", "seasonal", 5, 3, 2, 3, "Adrenaline seekers|Summer travel|Group trips"],
  ["Sami Reindeer Migration Celebrations", "Kautokeino", "Norway", "Europe", 69.0097, 23.0417, "2026-04-15", "2026-04-25", "cultural_heritage|seasonal", 2, 4, 5, 2, "Cultural immersion|Local authenticity|Winter travel"],
  ["Fire Festivals of the Pyrenees", "Huesca", "Spain", "Europe", 42.1401, -0.4081, "2026-06-23", "2026-06-23", "seasonal|cultural_heritage", 4, 5, 4, 2, "Summer travel|Traditional heritage|Adrenaline seekers"],
  ["La Merce", "Barcelona", "Spain", "Europe", 41.3851, 2.1734, "2026-09-24", "2026-09-27", "civic_national_holiday|carnival_parade", 5, 5, 4, 5, "Street celebrations|Summer travel|Photography"],
  ["Castells Festivals", "Tarragona", "Spain", "Europe", 41.1189, 1.2445, "2026-09-23", "2026-09-23", "cultural_heritage", 2, 5, 5, 3, "Traditional heritage|Cultural immersion|Summer travel"],
  ["Fete du Citron", "Menton", "France", "Europe", 43.7744, 7.4976, "2026-02-14", "2026-03-03", "seasonal|carnival_parade", 3, 5, 3, 4, "Photography|Winter travel|Street celebrations"],
  ["El Colacho", "Castrillo de Murcia", "Spain", "Europe", 42.3281, -4.0606, "2026-06-14", "2026-06-14", "cultural_heritage|religious_spiritual", 3, 3, 4, 2, "Traditional heritage|Family-friendly|Cultural immersion"],
  ["Mardi Gras New Orleans", "New Orleans", "United States", "North America", 29.9511, -90.0715, "2026-02-06", "2026-02-17", "carnival_parade|cultural_heritage", 5, 5, 4, 5, "Street celebrations|Music lovers|Group trips"],
  ["Albuquerque International Balloon Fiesta", "Albuquerque", "United States", "North America", 35.0844, -106.6504, "2026-10-03", "2026-10-11", "seasonal|arts", 3, 5, 2, 4, "Photography|Family-friendly|Weekend getaway"],
  ["Burning Man", "Gerlach", "United States", "North America", 40.6516, -119.3593, "2026-08-30", "2026-09-07", "seasonal|arts|music", 5, 5, 4, 4, "Group trips|Art and design|Adrenaline seekers"],
  ["Coachella", "Indio", "United States", "North America", 33.7206, -116.215, "2026-04-10", "2026-04-19", "music|arts", 5, 5, 3, 5, "Music lovers|Photography|Group trips"],
  ["Glastonbury Festival", "Pilton", "United Kingdom", "Europe", 51.1525, -2.5944, "2026-06-24", "2026-06-28", "music", 5, 5, 3, 5, "Music lovers|Summer travel|Group trips"],
  ["Roskilde Festival", "Roskilde", "Denmark", "Europe", 55.6415, 12.0803, "2026-06-27", "2026-07-04", "music", 5, 5, 2, 4, "Music lovers|Summer travel|Nightlife"],
  ["Songkran", "Bangkok", "Thailand", "Asia", 13.7563, 100.5018, "2026-04-13", "2026-04-15", "seasonal|cultural_heritage|food_drink", 5, 4, 4, 4, "Street celebrations|Photography|Summer travel"],
  ["Holi Festival Mathura", "Mathura", "India", "Asia", 27.4924, 77.6737, "2026-03-03", "2026-03-08", "religious_spiritual|seasonal|cultural_heritage", 5, 5, 5, 3, "Cultural immersion|Photography|Traditional heritage"],
  ["Pingxi Sky Lantern Festival", "Pingxi", "Taiwan", "Asia", 25.0262, 121.7128, "2026-02-27", "2026-03-01", "seasonal|cultural_heritage", 4, 5, 4, 4, "Photography|Romantic getaway|Traditional heritage"],
  ["Day of the Dead Oaxaca", "Oaxaca", "Mexico", "North America", 17.0732, -96.7266, "2026-11-01", "2026-11-02", "religious_spiritual|cultural_heritage|seasonal", 4, 5, 5, 3, "Cultural immersion|Traditional heritage|Photography"],
  ["Barranquilla Carnival", "Barranquilla", "Colombia", "South America", 10.9685, -74.7813, "2026-02-14", "2026-02-17", "carnival_parade|cultural_heritage", 5, 5, 4, 3, "Street celebrations|Music lovers|Photography"],
  ["Carnival of Oruro", "Oruro", "Bolivia", "South America", -17.9647, -67.1064, "2026-02-14", "2026-02-21", "carnival_parade|cultural_heritage", 4, 5, 5, 2, "Traditional heritage|Cultural immersion|Photography"],
  ["Fuji Rock Festival", "Yuzawa", "Japan", "Asia", 36.9333, 138.8167, "2026-07-24", "2026-07-26", "music", 5, 4, 3, 3, "Music lovers|Summer travel|Solo travelers"],
  ["Chinese New Year Hong Kong", "Hong Kong", "Hong Kong", "Asia", 22.3193, 114.1694, "2026-02-15", "2026-02-19", "cultural_heritage|seasonal", 4, 5, 4, 5, "Street celebrations|Photography|Family-friendly"],
  ["Montreux Jazz Festival", "Montreux", "Switzerland", "Europe", 46.433, 6.9104, "2026-07-03", "2026-07-18", "music|arts", 4, 5, 4, 4, "Music lovers|Luxury travel|Summer travel"],
  ["Amsterdam Dance Event", "Amsterdam", "Netherlands", "Europe", 52.3676, 4.9041, "2026-10-21", "2026-10-24", "music", 5, 4, 2, 5, "Nightlife|Music lovers|Group trips"],
  ["Festa Frawli", "Mgarr", "Malta", "Europe", 35.9205, 14.3663, "2026-04-12", "2026-04-12", "food_drink|seasonal|cultural_heritage", 3, 4, 4, 3, "Food travel|Local authenticity|Family-friendly"],
  ["Beltane Fire Festival", "Edinburgh", "United Kingdom", "Europe", 55.9533, -3.1883, "2026-04-30", "2026-04-30", "seasonal|cultural_heritage", 4, 5, 4, 4, "Street celebrations|Photography|Traditional heritage"],
  ["Malta International Fireworks Festival", "Valletta", "Malta", "Europe", 35.8981, 14.5125, "2026-04-18", "2026-04-30", "seasonal|arts", 4, 5, 2, 4, "Photography|Romantic getaway|Nightlife"],
  ["Feast of St George Qormi", "Qormi", "Malta", "Europe", 35.8764, 14.4719, "2026-06-22", "2026-06-28", "religious_spiritual|carnival_parade|cultural_heritage", 4, 5, 5, 3, "Traditional heritage|Street celebrations|Cultural immersion"],
  ["Santa Marija Feast Victoria Gozo", "Victoria", "Malta", "Europe", 36.0444, 14.2397, "2026-08-09", "2026-08-15", "religious_spiritual|carnival_parade|cultural_heritage", 4, 5, 5, 3, "Religious significance|Traditional heritage|Photography"],
  ["Mnarja Nadur Gozo", "Nadur", "Malta", "Europe", 36.0378, 14.2942, "2026-06-28", "2026-06-29", "religious_spiritual|seasonal|cultural_heritage", 4, 4, 5, 3, "Traditional heritage|Food travel|Local authenticity"],
  ["Mosta Assumption Feast", "Mosta", "Malta", "Europe", 35.9097, 14.4263, "2026-08-09", "2026-08-15", "religious_spiritual|carnival_parade|cultural_heritage", 4, 5, 4, 4, "Religious significance|Photography|Street celebrations"],
  ["Birkirkara St Helen Feast", "Birkirkara", "Malta", "Europe", 35.8972, 14.4619, "2026-08-14", "2026-08-18", "religious_spiritual|carnival_parade|cultural_heritage", 4, 5, 4, 3, "Traditional heritage|Street celebrations|Photography"],
  ["Zejtun St Gregory Feast", "Zejtun", "Malta", "Europe", 35.8558, 14.5331, "2026-07-10", "2026-07-14", "religious_spiritual|carnival_parade|cultural_heritage", 4, 5, 4, 3, "Traditional heritage|Summer travel|Street celebrations"],
  ["Victory Day Grand Harbour Regatta", "Senglea", "Malta", "Europe", 35.8878, 14.5167, "2026-09-08", "2026-09-08", "civic_national_holiday|historical|cultural_heritage", 3, 5, 4, 3, "Photography|Traditional heritage|Cultural immersion"],
  ["Nadur Carnival Gozo", "Nadur", "Malta", "Europe", 36.0378, 14.2942, "2026-02-12", "2026-02-17", "carnival_parade|cultural_heritage", 5, 5, 4, 3, "Street celebrations|Local authenticity|Photography"],
  ["Festa ta San Georg Victoria Gozo", "Victoria", "Malta", "Europe", 36.0444, 14.2397, "2026-07-12", "2026-07-19", "religious_spiritual|carnival_parade|cultural_heritage", 4, 5, 5, 3, "Religious significance|Traditional heritage|Photography"],
  ["Festa San Filep Zebbug Gozo", "Zebbug", "Malta", "Europe", 36.071, 14.236, "2026-06-07", "2026-06-14", "religious_spiritual|carnival_parade|cultural_heritage", 3, 4, 5, 2, "Traditional heritage|Religious significance|Local authenticity"],
  ["Batalla del Vino Haro", "Haro", "Spain", "Europe", 42.5769, -2.8466, "2026-06-27", "2026-06-29", "seasonal|food_drink|cultural_heritage", 4, 4, 4, 3, "Food travel|Street celebrations|Summer travel"],
  ["Moros y Cristianos Alcoy", "Alcoy", "Spain", "Europe", 38.7054, -0.4743, "2026-04-22", "2026-04-24", "historical|carnival_parade|cultural_heritage", 4, 5, 5, 2, "Traditional heritage|Photography|Cultural immersion"],
  ["Patios de Cordoba Festival", "Cordoba", "Spain", "Europe", 37.8882, -4.7794, "2026-05-01", "2026-05-14", "seasonal|cultural_heritage", 2, 5, 5, 4, "Photography|Romantic getaway|Cultural immersion"],
  ["Tamborrada San Sebastian", "San Sebastian", "Spain", "Europe", 43.3183, -1.9812, "2026-01-20", "2026-01-20", "historical|civic_national_holiday|cultural_heritage", 4, 4, 5, 3, "Traditional heritage|Street celebrations|Photography"],
  ["Aste Nagusia Bilbao", "Bilbao", "Spain", "Europe", 43.2627, -2.9253, "2026-08-21", "2026-08-28", "carnival_parade|cultural_heritage|music", 5, 5, 4, 4, "Street celebrations|Summer travel|Music lovers"],
  ["Hogueras de Alicante", "Alicante", "Spain", "Europe", 38.3452, -0.481, "2026-06-20", "2026-06-24", "seasonal|carnival_parade|cultural_heritage", 5, 5, 4, 4, "Photography|Summer travel|Street celebrations"],
  ["Santa Cruz de Tenerife Carnival", "Santa Cruz de Tenerife", "Spain", "Europe", 28.4636, -16.2518, "2026-02-11", "2026-02-17", "carnival_parade|cultural_heritage", 5, 5, 4, 4, "Street celebrations|Photography|Winter travel"],
  ["Romeria del Rocio", "Almonte", "Spain", "Europe", 37.2647, -6.5167, "2026-05-30", "2026-06-01", "religious_spiritual|cultural_heritage|seasonal", 3, 4, 5, 4, "Religious significance|Traditional heritage|Cultural immersion"],
  ["Fiestas del Pilar Zaragoza", "Zaragoza", "Spain", "Europe", 41.6488, -0.8891, "2026-10-07", "2026-10-15", "religious_spiritual|carnival_parade|cultural_heritage", 4, 5, 5, 4, "Street celebrations|Traditional heritage|Photography"],
  ["Calcio Storico Fiorentino", "Florence", "Italy", "Europe", 43.7696, 11.2558, "2026-06-24", "2026-06-24", "historical|cultural_heritage", 5, 4, 5, 4, "Adrenaline seekers|Traditional heritage|Photography"],
  ["Scoppio del Carro", "Florence", "Italy", "Europe", 43.7731, 11.2558, "2026-04-05", "2026-04-05", "religious_spiritual|historical|cultural_heritage", 3, 5, 5, 4, "Religious significance|Traditional heritage|Photography"],
  ["Infiorata di Noto", "Noto", "Italy", "Europe", 36.8917, 15.07, "2026-05-29", "2026-05-31", "religious_spiritual|seasonal|cultural_heritage", 2, 5, 5, 3, "Photography|Art and design|Romantic getaway"],
  ["Umbria Jazz Festival", "Perugia", "Italy", "Europe", 43.1107, 12.3908, "2026-07-10", "2026-07-19", "music|arts", 4, 4, 4, 4, "Music lovers|Summer travel|Food travel"],
  ["Viareggio Carnival", "Viareggio", "Italy", "Europe", 43.8667, 10.25, "2026-02-07", "2026-02-25", "carnival_parade|cultural_heritage|arts", 5, 5, 4, 3, "Street celebrations|Photography|Art and design"],
  ["Torres Vedras Carnival", "Torres Vedras", "Portugal", "Europe", 39.091, -9.2586, "2026-02-12", "2026-02-17", "carnival_parade|cultural_heritage", 5, 5, 4, 3, "Street celebrations|Photography|Winter travel"],
  ["Romaria de Viana do Castelo", "Viana do Castelo", "Portugal", "Europe", 41.6918, -8.8344, "2026-08-20", "2026-08-24", "religious_spiritual|carnival_parade|cultural_heritage", 4, 5, 5, 3, "Traditional heritage|Photography|Cultural immersion"],
  ["Madeira Flower Festival", "Funchal", "Portugal", "Europe", 32.6669, -16.9241, "2026-05-02", "2026-05-11", "seasonal|carnival_parade|cultural_heritage", 3, 5, 4, 4, "Photography|Romantic getaway|Traditional heritage"],
  ["Santos Populares Lisbon", "Lisbon", "Portugal", "Europe", 38.7223, -9.1393, "2026-06-12", "2026-06-13", "carnival_parade|music|cultural_heritage", 5, 4, 4, 4, "Street celebrations|Nightlife|Food travel"],
  ["Fete de la Musique Paris", "Paris", "France", "Europe", 48.8566, 2.3522, "2026-06-21", "2026-06-21", "music|civic_national_holiday|arts", 5, 4, 3, 5, "Music lovers|Nightlife|Summer travel"],
  ["Festival d'Avignon", "Avignon", "France", "Europe", 43.9493, 4.8055, "2026-07-04", "2026-07-25", "arts|music|historical", 3, 4, 5, 4, "Art and design|Cultural immersion|Summer travel"],
  ["Cologne Carnival", "Cologne", "Germany", "Europe", 50.9375, 6.9603, "2026-02-12", "2026-02-17", "carnival_parade|cultural_heritage", 5, 5, 4, 4, "Street celebrations|Winter travel|Group trips"],
  ["Wacken Open Air", "Wacken", "Germany", "Europe", 54.0614, 9.3758, "2026-07-29", "2026-07-31", "music", 5, 5, 2, 3, "Music lovers|Adrenaline seekers|Group trips"],
  ["Cannstatter Volksfest", "Stuttgart", "Germany", "Europe", 48.7758, 9.1829, "2026-09-25", "2026-10-11", "seasonal|food_drink|cultural_heritage", 4, 4, 4, 4, "Food travel|Group trips|Summer travel"],
  ["Amsterdam Pride", "Amsterdam", "Netherlands", "Europe", 52.3676, 4.9041, "2026-07-26", "2026-08-03", "carnival_parade|civic_national_holiday", 5, 5, 3, 5, "Street celebrations|Nightlife|Photography"],
  ["Carnival of Binche", "Binche", "Belgium", "Europe", 50.411, 4.1645, "2026-02-15", "2026-02-17", "carnival_parade|cultural_heritage|historical", 4, 5, 5, 3, "Traditional heritage|Photography|Cultural immersion"],
  ["Distortion Copenhagen", "Copenhagen", "Denmark", "Europe", 55.6761, 12.5683, "2026-06-03", "2026-06-07", "music|carnival_parade", 5, 4, 2, 4, "Music lovers|Nightlife|Summer travel"],
  ["Thorrablot Reykjavik", "Reykjavik", "Iceland", "Europe", 64.1466, -21.9426, "2026-01-23", "2026-01-25", "seasonal|food_drink|cultural_heritage", 3, 3, 5, 2, "Food travel|Traditional heritage|Winter travel"],
  ["Ligo Festival Riga", "Riga", "Latvia", "Europe", 56.9496, 24.1052, "2026-06-23", "2026-06-24", "seasonal|cultural_heritage", 4, 4, 5, 3, "Traditional heritage|Summer travel|Romantic getaway"],
  ["Perchtenlauf Salzburg", "Salzburg", "Austria", "Europe", 47.8095, 13.055, "2026-12-05", "2026-12-06", "seasonal|cultural_heritage", 3, 5, 5, 3, "Traditional heritage|Winter travel|Photography"],
  ["Sighisoara Medieval Festival", "Sighisoara", "Romania", "Europe", 46.2189, 24.791, "2026-07-22", "2026-07-26", "historical|arts|cultural_heritage", 3, 4, 5, 3, "Traditional heritage|Cultural immersion|Photography"],
  ["Entroido Verin", "Verin", "Spain", "Europe", 41.9415, -7.4386, "2026-02-08", "2026-02-17", "carnival_parade|cultural_heritage", 5, 5, 4, 3, "Street celebrations|Photography|Winter travel"],
  ["Carnival of Cadiz", "Cadiz", "Spain", "Europe", 36.5267, -6.2891, "2026-02-12", "2026-02-22", "carnival_parade|cultural_heritage", 5, 5, 4, 4, "Street celebrations|Music lovers|Photography"],
  ["Patum de Berga", "Berga", "Spain", "Europe", 42.0972, 1.8469, "2026-06-04", "2026-06-07", "religious_spiritual|cultural_heritage|historical", 4, 5, 5, 2, "Traditional heritage|Cultural immersion|Photography"],
  ["Calcotada Valls", "Valls", "Spain", "Europe", 41.2869, 1.2499, "2026-01-26", "2026-02-02", "food_drink|seasonal|cultural_heritage", 3, 3, 4, 3, "Food travel|Local authenticity|Family-friendly"],
  ["Fiesta Santa Marta de Ribarteme", "As Neves", "Spain", "Europe", 42.0889, -8.7501, "2026-07-29", "2026-07-29", "religious_spiritual|cultural_heritage", 2, 3, 5, 2, "Religious significance|Traditional heritage|Cultural immersion"],
  ["Fallas Denia", "Denia", "Spain", "Europe", 38.8408, 0.1057, "2026-03-15", "2026-03-19", "seasonal|carnival_parade|cultural_heritage", 4, 5, 4, 3, "Photography|Street celebrations|Family-friendly"],
  ["Festa dei Ceri Gubbio", "Gubbio", "Italy", "Europe", 43.3512, 12.5727, "2026-05-15", "2026-05-15", "religious_spiritual|cultural_heritage|historical", 4, 5, 5, 3, "Traditional heritage|Adrenaline seekers|Cultural immersion"],
  ["Festa di Sant Agata Catania", "Catania", "Italy", "Europe", 37.5079, 15.083, "2026-02-03", "2026-02-05", "religious_spiritual|carnival_parade|cultural_heritage", 5, 5, 5, 4, "Religious significance|Traditional heritage|Street celebrations"],
  ["Festa del Redentore", "Venice", "Italy", "Europe", 45.4342, 12.3384, "2026-07-18", "2026-07-19", "religious_spiritual|seasonal|cultural_heritage", 4, 5, 5, 5, "Romantic getaway|Photography|Traditional heritage"],
  ["Madonna della Bruna Matera", "Matera", "Italy", "Europe", 40.6664, 16.6043, "2026-07-02", "2026-07-02", "religious_spiritual|carnival_parade|cultural_heritage", 4, 5, 5, 3, "Traditional heritage|Photography|Cultural immersion"],
  ["Notte della Taranta", "Melpignano", "Italy", "Europe", 40.1367, 18.2964, "2026-08-22", "2026-08-27", "music|cultural_heritage", 4, 5, 5, 3, "Music lovers|Traditional heritage|Summer travel"],
  ["Sagra del Tartufo Alba", "Alba", "Italy", "Europe", 44.7009, 8.0357, "2026-10-09", "2026-10-11", "food_drink|seasonal", 3, 4, 4, 4, "Food travel|Luxury travel|Photography"],
  ["Luminara di San Ranieri", "Pisa", "Italy", "Europe", 43.7166, 10.4017, "2026-06-16", "2026-06-16", "religious_spiritual|seasonal|cultural_heritage", 3, 5, 5, 4, "Photography|Romantic getaway|Religious significance"],
  ["Feria de Nimes", "Nimes", "France", "Europe", 43.8367, 4.3601, "2026-05-22", "2026-05-25", "seasonal|carnival_parade|cultural_heritage", 4, 4, 4, 4, "Street celebrations|Summer travel|Photography"],
  ["Braderie de Lille", "Lille", "France", "Europe", 50.6292, 3.0573, "2026-09-05", "2026-09-06", "civic_national_holiday|food_drink|cultural_heritage", 4, 3, 3, 4, "Food travel|Street celebrations|Budget-friendly"],
  ["Fetes de Bayonne", "Bayonne", "France", "Europe", 43.4929, -1.4768, "2026-07-23", "2026-07-26", "carnival_parade|cultural_heritage", 5, 5, 4, 4, "Street celebrations|Summer travel|Music lovers"],
  ["Carnaval de Dunkerque", "Dunkerque", "France", "Europe", 51.0343, 2.3768, "2026-02-14", "2026-03-15", "carnival_parade|cultural_heritage", 5, 5, 4, 3, "Street celebrations|Photography|Traditional heritage"],
  ["Nuit Blanche Paris", "Paris", "France", "Europe", 48.8566, 2.3522, "2026-10-03", "2026-10-04", "arts|music", 3, 5, 4, 5, "Art and design|Nightlife|Photography"],
  ["Transhumance Provence", "Saint-Remy-de-Provence", "France", "Europe", 43.7884, 4.8317, "2026-05-25", "2026-05-25", "seasonal|cultural_heritage", 2, 4, 4, 3, "Photography|Local authenticity|Traditional heritage"],
  ["Walpurgisnacht Harz", "Thale", "Germany", "Europe", 51.7519, 11.04, "2026-04-30", "2026-05-01", "seasonal|cultural_heritage", 4, 5, 4, 3, "Traditional heritage|Photography|Nightlife"],
  ["Hafengeburtstag Hamburg", "Hamburg", "Germany", "Europe", 53.5458, 9.9662, "2026-05-08", "2026-05-10", "civic_national_holiday|seasonal", 4, 5, 3, 4, "Photography|Family-friendly|Street celebrations"],
  ["Bergkirchweih Erlangen", "Erlangen", "Germany", "Europe", 49.5898, 11.0117, "2026-05-15", "2026-05-26", "seasonal|food_drink|cultural_heritage", 4, 4, 3, 3, "Food travel|Group trips|Traditional heritage"],
  ["Rock am Ring", "Nuerburg", "Germany", "Europe", 50.3356, 6.9474, "2026-06-05", "2026-06-07", "music", 5, 5, 2, 4, "Music lovers|Adrenaline seekers|Group trips"],
  ["Schaferlauf Markgroningen", "Markgroningen", "Germany", "Europe", 48.9056, 9.0806, "2026-07-24", "2026-07-26", "historical|seasonal|cultural_heritage", 3, 4, 5, 2, "Traditional heritage|Family-friendly|Local authenticity"],
  ["Hay Festival Hay on Wye", "Hay-on-Wye", "United Kingdom", "Europe", 52.0743, -3.1246, "2026-05-21", "2026-05-31", "arts|music", 2, 3, 5, 3, "Cultural immersion|Romantic getaway|Art and design"],
  ["Lewes Bonfire Night", "Lewes", "United Kingdom", "Europe", 50.8759, 0.0177, "2026-11-05", "2026-11-05", "historical|civic_national_holiday|seasonal", 4, 5, 4, 3, "Photography|Traditional heritage|Adrenaline seekers"],
  ["Sinterklaas Intocht Amsterdam", "Amsterdam", "Netherlands", "Europe", 52.3676, 4.9041, "2026-11-15", "2026-11-15", "seasonal|cultural_heritage", 3, 4, 3, 4, "Family-friendly|Street celebrations|Winter travel"],
  ["Olsok Trondheim", "Trondheim", "Norway", "Europe", 63.4305, 10.3951, "2026-07-29", "2026-07-29", "religious_spiritual|cultural_heritage|historical", 2, 4, 5, 3, "Religious significance|Traditional heritage|Cultural immersion"],
  ["Juhannus Helsinki", "Helsinki", "Finland", "Europe", 60.1699, 24.9384, "2026-06-19", "2026-06-20", "seasonal|cultural_heritage", 4, 4, 4, 3, "Summer travel|Romantic getaway|Traditional heritage"],
  ["Flow Festival Helsinki", "Helsinki", "Finland", "Europe", 60.1699, 24.9384, "2026-08-14", "2026-08-16", "music|arts", 5, 4, 3, 4, "Music lovers|Summer travel|Nightlife"],
  ["Sami Easter Festival Kautokeino", "Kautokeino", "Norway", "Europe", 69.0097, 23.0417, "2026-04-02", "2026-04-06", "religious_spiritual|cultural_heritage|seasonal", 2, 4, 5, 2, "Cultural immersion|Traditional heritage|Religious significance"],
  ["Uzgavenes Vilnius", "Vilnius", "Lithuania", "Europe", 54.6872, 25.2797, "2026-02-17", "2026-02-17", "carnival_parade|seasonal|cultural_heritage", 4, 5, 5, 3, "Street celebrations|Traditional heritage|Winter travel"],
  ["Paleni Carodejnic Prague", "Prague", "Czech Republic", "Europe", 50.0755, 14.4378, "2026-04-30", "2026-04-30", "seasonal|carnival_parade|cultural_heritage", 4, 5, 4, 4, "Street celebrations|Photography|Nightlife"],
  ["Prague Spring International Music Festival", "Prague", "Czech Republic", "Europe", 50.0755, 14.4378, "2026-05-12", "2026-06-03", "music|arts", 2, 4, 5, 4, "Music lovers|Cultural immersion|Luxury travel"],
  ["Ultra Europe Split", "Split", "Croatia", "Europe", 43.5147, 16.4402, "2026-07-10", "2026-07-12", "music", 5, 5, 2, 5, "Music lovers|Summer travel|Nightlife"],
  ["Rijeka Carnival", "Rijeka", "Croatia", "Europe", 45.3271, 14.4422, "2026-02-07", "2026-02-25", "carnival_parade|cultural_heritage", 5, 5, 3, 3, "Street celebrations|Winter travel|Photography"],
  ["Open'er Festival Gdynia", "Gdynia", "Poland", "Europe", 54.5189, 18.5305, "2026-07-01", "2026-07-04", "music", 5, 5, 2, 4, "Music lovers|Summer travel|Group trips"],
  ["Electric Castle Festival", "Bontida", "Romania", "Europe", 46.912, 23.781, "2026-07-16", "2026-07-20", "music|arts", 5, 5, 2, 4, "Music lovers|Nightlife|Summer travel"],
  ["Pohoda Festival", "Trencin", "Slovakia", "Europe", 48.8942, 18.0406, "2026-07-10", "2026-07-12", "music", 5, 5, 3, 3, "Music lovers|Summer travel|Group trips"],
  ["Sarajevo Film Festival", "Sarajevo", "Bosnia and Herzegovina", "Europe", 43.8563, 18.4131, "2026-08-14", "2026-08-22", "arts", 3, 4, 5, 3, "Art and design|Cultural immersion|Photography"],
  ["Istanbul Tulip Festival", "Istanbul", "Turkey", "Europe", 41.0082, 28.9784, "2026-04-01", "2026-04-30", "seasonal|cultural_heritage", 3, 5, 4, 5, "Photography|Romantic getaway|Cultural immersion"],
  ["Kirkpinar Oil Wrestling Festival", "Edirne", "Turkey", "Europe", 41.6771, 26.5556, "2026-07-01", "2026-07-04", "historical|seasonal|cultural_heritage", 4, 4, 5, 3, "Traditional heritage|Adrenaline seekers|Photography"],
  ["Malanka Festival Chernivtsi", "Chernivtsi", "Ukraine", "Europe", 48.2921, 25.9358, "2026-01-13", "2026-01-14", "seasonal|cultural_heritage", 4, 5, 5, 2, "Traditional heritage|Winter travel|Cultural immersion"],
  ["Tbilisoba", "Tbilisi", "Georgia", "Europe", 41.7151, 44.8271, "2026-10-17", "2026-10-18", "civic_national_holiday|food_drink|cultural_heritage", 4, 5, 5, 3, "Food travel|Street celebrations|Cultural immersion"],
  ["Iceland Airwaves", "Reykjavik", "Iceland", "Europe", 64.1466, -21.9426, "2026-11-05", "2026-11-08", "music|arts", 5, 4, 4, 4, "Music lovers|Winter travel|Nightlife"],
  ["Rockwave Festival", "Athens", "Greece", "Europe", 37.9838, 23.7275, "2026-07-04", "2026-07-06", "music", 5, 5, 2, 4, "Music lovers|Summer travel|Adrenaline seekers"],
  ["Orthodox Easter Corfu", "Corfu", "Greece", "Europe", 39.6243, 19.9217, "2026-04-10", "2026-04-12", "religious_spiritual|seasonal|cultural_heritage", 3, 5, 5, 4, "Religious significance|Cultural immersion|Photography"]
];

function rowToFestival(r) {
  const [name, city, country, continent, lat, lng, start, end, typesStr, pe, vs, cd, td, bestStr] = r;
  const rawSlug = slugify(name);
  const id = SLUG_ID_OVERRIDES[rawSlug] ?? rawSlug;
  const displayName = DISPLAY_NAME_BY_ID[id] ?? name;
  const eventTypes = typesStr.split("|");
  const bestFor = bestStr.split("|");
  const description = `Highlights of ${displayName} in ${city}: a celebrated gathering drawing visitors for tradition, spectacle, and local atmosphere.`;
  return {
    id,
    slug: id,
    name: displayName,
    description,
    city,
    country,
    continent,
    latitude: lat,
    longitude: lng,
    startDate: start,
    endDate: end,
    eventTypes,
    imageUrl: pickImg(),
    partyEnergy: pe,
    visualSpectacle: vs,
    culturalDepth: cd,
    tourismDensity: td,
    bestFor
  };
}

const festivals = rows.map(rowToFestival);

function emit(o) {
  const et = o.eventTypes.map((t) => `"${t}"`).join(", ");
  const bf = o.bestFor.map((t) => `"${t}"`).join(", ");
  return `  {
    id: "${o.id}",
    slug: "${o.slug}",
    name: ${JSON.stringify(o.name)},
    description: ${JSON.stringify(o.description)},
    city: "${o.city}",
    country: "${o.country}",
    continent: "${o.continent}",
    latitude: ${o.latitude},
    longitude: ${o.longitude},
    startDate: "${o.startDate}",
    endDate: "${o.endDate}",
    eventTypes: [${et}],
    imageUrl: "${o.imageUrl}",
    partyEnergy: ${o.partyEnergy},
    visualSpectacle: ${o.visualSpectacle},
    culturalDepth: ${o.culturalDepth},
    tourismDensity: ${o.tourismDensity},
    bestFor: [${bf}]
  }`;
}

const out2 = `import type { Festival } from "@/types/festival";

/** Expanded from your 100-name list (festival-ideas.ts) — events not already in festivals.ts. */
export const festivalsMore: Festival[] = [
${festivals.map(emit).join(",\n")}
];
`;

const target = join(__dirname, "..", "src", "data", "festivals-more.ts");
fs.writeFileSync(target, out2, "utf8");
console.log("Wrote", target, "count", festivals.length);
