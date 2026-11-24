const picture = name => new URL('../images/product-' + name + '.jpg', import.meta.url).href;

export const newFlavors = [
  {
    id: 'mango', name: 'Манго из Ада',
    description: 'Сладкое манго и хабанеро. Сначала тропики, потом пожар.',
    price: 169, weight: '100 г', image: picture('mango'), color: '#ff8a32',
    category: 'острые', spiceLevel: 5, mascotPose: 'Выдыхает розовое пламя'
  },
  {
    id: 'cheddar', name: 'Чеддерный Оскал',
    description: 'Копчёный чеддер и маринованный халапеньо. Сырный хруст с укусом.',
    price: 159, weight: '100 г', image: picture('cheddar'), color: '#ffc942',
    category: 'острые', spiceLevel: 2, mascotPose: 'Грызёт раскалённый сыр'
  },
  {
    id: 'wasabi', name: 'Васаби-призрак',
    description: 'Васаби, чёрный кунжут и щепотка морской соли. Бьёт прямо в нос.',
    price: 169, weight: '100 г', image: picture('wasabi'), color: '#65f5bc',
    category: 'концептуальные', spiceLevel: 3, mascotPose: 'Исчезает в зелёном дыму'
  }
];
