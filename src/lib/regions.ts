/** Country + subdivision lists for checkout dropdowns. */

export const COUNTRIES: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "IE", name: "Ireland" },
  { code: "PT", name: "Portugal" },
  { code: "PL", name: "Poland" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "HK", name: "Hong Kong" },
  { code: "TW", name: "Taiwan" },
  { code: "KR", name: "South Korea" },
  { code: "SG", name: "Singapore" },
  { code: "MY", name: "Malaysia" },
  { code: "TH", name: "Thailand" },
  { code: "PH", name: "Philippines" },
  { code: "ID", name: "Indonesia" },
  { code: "VN", name: "Vietnam" },
  { code: "IN", name: "India" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "MX", name: "Mexico" },
  { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "ZA", name: "South Africa" },
]

const P: Record<string, { code: string; name: string }[]> = {
  US: [
    ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
    ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"],
    ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
    ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
    ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
    ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
    ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
    ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"],
    ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
    ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"],
    ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
  ].map(([code, name]) => ({ code, name })),
  CA: [
    ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"], ["NB", "New Brunswick"],
    ["NL", "Newfoundland and Labrador"], ["NT", "Northwest Territories"], ["NS", "Nova Scotia"],
    ["NU", "Nunavut"], ["ON", "Ontario"], ["PE", "Prince Edward Island"], ["QC", "Quebec"],
    ["SK", "Saskatchewan"], ["YT", "Yukon"],
  ].map(([code, name]) => ({ code, name })),
  AU: [
    ["ACT", "Australian Capital Territory"], ["NSW", "New South Wales"], ["NT", "Northern Territory"],
    ["QLD", "Queensland"], ["SA", "South Australia"], ["TAS", "Tasmania"], ["VIC", "Victoria"], ["WA", "Western Australia"],
  ].map(([code, name]) => ({ code, name })),
  GB: [
    ["ENG", "England"], ["SCT", "Scotland"], ["WLS", "Wales"], ["NIR", "Northern Ireland"],
  ].map(([code, name]) => ({ code, name })),
  DE: [
    "Baden-Württemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hesse",
    "Lower Saxony", "Mecklenburg-Vorpommern", "North Rhine-Westphalia", "Rhineland-Palatinate",
    "Saarland", "Saxony", "Saxony-Anhalt", "Schleswig-Holstein", "Thuringia",
  ].map((name) => ({ code: name, name })),
  FR: [
    "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Brittany", "Centre-Val de Loire", "Corsica",
    "Grand Est", "Hauts-de-France", "Île-de-France", "Normandy", "Nouvelle-Aquitaine", "Occitanie",
    "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
  ].map((name) => ({ code: name, name })),
  IT: [
    "Abruzzo", "Aosta Valley", "Apulia", "Basilicata", "Calabria", "Campania", "Emilia-Romagna",
    "Friuli-Venezia Giulia", "Lazio", "Liguria", "Lombardy", "Marche", "Molise", "Piedmont",
    "Sardinia", "Sicily", "Trentino-Alto Adige", "Tuscany", "Umbria", "Veneto",
  ].map((name) => ({ code: name, name })),
  ES: [
    "Andalusia", "Aragon", "Asturias", "Balearic Islands", "Basque Country", "Canary Islands",
    "Cantabria", "Castile and León", "Castile-La Mancha", "Catalonia", "Extremadura", "Galicia",
    "La Rioja", "Madrid", "Murcia", "Navarre", "Valencia",
  ].map((name) => ({ code: name, name })),
  NL: [
    "Drenthe", "Flevoland", "Friesland", "Gelderland", "Groningen", "Limburg", "North Brabant",
    "North Holland", "Overijssel", "South Holland", "Utrecht", "Zeeland",
  ].map((name) => ({ code: name, name })),
  CN: [
    "Anhui", "Beijing", "Chongqing", "Fujian", "Gansu", "Guangdong", "Guangxi", "Guizhou", "Hainan",
    "Hebei", "Heilongjiang", "Henan", "Hubei", "Hunan", "Inner Mongolia", "Jiangsu", "Jiangxi",
    "Jilin", "Liaoning", "Ningxia", "Qinghai", "Shaanxi", "Shandong", "Shanghai", "Shanxi", "Sichuan",
    "Tianjin", "Tibet", "Xinjiang", "Yunnan", "Zhejiang",
  ].map((name) => ({ code: name, name })),
  JP: [
    "Hokkaido", "Aomori", "Iwate", "Miyagi", "Akita", "Yamagata", "Fukushima", "Ibaraki", "Tochigi",
    "Gunma", "Saitama", "Chiba", "Tokyo", "Kanagawa", "Niigata", "Toyama", "Ishikawa", "Fukui",
    "Yamanashi", "Nagano", "Gifu", "Shizuoka", "Aichi", "Mie", "Shiga", "Kyoto", "Osaka", "Hyogo",
    "Nara", "Wakayama", "Tottori", "Shimane", "Okayama", "Hiroshima", "Yamaguchi", "Tokushima",
    "Kagawa", "Ehime", "Kochi", "Fukuoka", "Saga", "Nagasaki", "Kumamoto", "Oita", "Miyazaki",
    "Kagoshima", "Okinawa",
  ].map((name) => ({ code: name, name })),
  KR: [
    "Seoul", "Busan", "Daegu", "Incheon", "Gwangju", "Daejeon", "Ulsan", "Sejong",
    "Gyeonggi", "Gangwon", "North Chungcheong", "South Chungcheong", "North Jeolla",
    "South Jeolla", "North Gyeongsang", "South Gyeongsang", "Jeju",
  ].map((name) => ({ code: name, name })),
  MX: [
    "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua",
    "Coahuila", "Colima", "Durango", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Mexico City",
    "México", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro",
    "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala",
    "Veracruz", "Yucatán", "Zacatecas",
  ].map((name) => ({ code: name, name })),
  BR: [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB",
    "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
  ].map((code) => ({ code, name: code })),
  IN: [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
    "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
    "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  ].map((name) => ({ code: name, name })),
  NZ: [
    "Auckland", "Bay of Plenty", "Canterbury", "Gisborne", "Hawke's Bay", "Manawatū-Whanganui",
    "Marlborough", "Nelson", "Northland", "Otago", "Southland", "Taranaki", "Tasman", "Waikato",
    "Wellington", "West Coast",
  ].map((name) => ({ code: name, name })),
  TW: [
    "Taipei", "New Taipei", "Taoyuan", "Taichung", "Tainan", "Kaohsiung", "Keelung", "Hsinchu",
    "Hsinchu County", "Miaoli", "Changhua", "Nantou", "Yunlin", "Chiayi", "Pingtung", "Yilan",
    "Hualien", "Taitung", "Penghu", "Kinmen", "Lienchiang",
  ].map((name) => ({ code: name, name })),
  MY: [
    "Johor", "Kedah", "Kelantan", "Kuala Lumpur", "Labuan", "Malacca", "Negeri Sembilan", "Pahang",
    "Penang", "Perak", "Perlis", "Putrajaya", "Sabah", "Sarawak", "Selangor", "Terengganu",
  ].map((name) => ({ code: name, name })),
  TH: [
    "Bangkok", "Chiang Mai", "Chiang Rai", "Chonburi", "Khon Kaen", "Nakhon Ratchasima",
    "Nonthaburi", "Pathum Thani", "Phuket", "Samut Prakan", "Songkhla", "Udon Thani",
  ].map((name) => ({ code: name, name })),
  PH: [
    "Metro Manila", "Abra", "Benguet", "Cebu", "Davao del Sur", "Iloilo", "Laguna", "Pampanga",
    "Rizal", "South Cotabato", "Zamboanga del Sur",
  ].map((name) => ({ code: name, name })),
  ID: [
    "Aceh", "Bali", "Banten", "Central Java", "East Java", "Jakarta", "West Java", "Yogyakarta",
    "West Sumatra", "North Sumatra", "South Sulawesi",
  ].map((name) => ({ code: name, name })),
  VN: [
    "Hanoi", "Ho Chi Minh City", "Da Nang", "Hai Phong", "Can Tho", "An Giang", "Binh Duong",
    "Dong Nai", "Khanh Hoa", "Lam Dong", "Quang Ninh", "Thua Thien Hue",
  ].map((name) => ({ code: name, name })),
  AE: [
    "Abu Dhabi", "Ajman", "Dubai", "Fujairah", "Ras Al Khaimah", "Sharjah", "Umm Al Quwain",
  ].map((name) => ({ code: name, name })),
}

export function provincesOf(country: string) {
  return P[String(country || "").toUpperCase()] || []
}

export function countryFromCurrency(code: string) {
  const m: Record<string, string> = {
    usd: "US", cad: "CA", aud: "AU", gbp: "GB", eur: "DE", jpy: "JP", cny: "CN", hkd: "HK",
  }
  return m[String(code || "usd").toLowerCase()] || "US"
}
