const editions = [
  {
    id: 'sus', name: 'ЖрисукаСус', price: 209, color: '#c5e960', spiceLevel: 2,
    description: 'Рифлёные начос с укропным рассолом и копчёным чесноком. Фанатская пачка с Супер Сусом в свете налобного фонаря.',
    mascotPose: 'Освещает дорогу под землёй'
  },
  {
    id: 'eclipse', name: 'Хруст А4', price: 219, color: '#ff9866', spiceLevel: 3,
    description: 'Угольные треугольники из чёрной кукурузы. Сначала цедра красного апельсина, затем дымная паприка.',
    mascotPose: 'Ягуар глотает солнечную корону'
  },
  {
    id: 'siren', name: 'Друже Нори', price: 219, color: '#70e9d6', spiceLevel: 1,
    description: 'Коралловые начос со свёклой, морской солью и хлопьями нори. Послевкусие кислого юдзу.',
    mascotPose: 'Поднимает волну перламутровой пеной'
  },
  {
    id: 'volt', name: 'ВилсаХруст', price: 209, color: '#ffdc42', spiceLevel: 3,
    description: 'Синие кукурузные чипсы с маринованной грушей. Зернистая горчица хрустит, имбирь щиплет язык.',
    mascotPose: 'Саламандра ловит молнию'
  }
];
export const limitedDrops = editions.map(item => ({
  ...item, weight:'100 г', category:'лимитированные',
  image:new URL('../images/fan-' + ({sus:'sus', eclipse:'a4', siren:'obl', volt:'wyl'})[item.id] + '.webp', import.meta.url).href
}));
