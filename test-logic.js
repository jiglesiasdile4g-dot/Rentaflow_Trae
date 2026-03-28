const anuncios = [{"ida":31,"Referencia":"IF-001-CH","Direccion":"Velazquez 35","Precio":1200,"Activacion":"Activo","usuario":3}];
const inmueble = "IF-001-CH";

const selectedAd = anuncios.find(ad => String(ad?.Referencia || ad?.Direccion || ad?.ida || "") === inmueble) || {};
const propPrice = selectedAd?.Precio || selectedAd?.precio || 0;
const propPriceLabel = propPrice ? ` €/mes` : "Consultar";

console.log('selectedAd:', selectedAd);
console.log('propPrice:', propPrice);
console.log('propPriceLabel:', propPriceLabel);
