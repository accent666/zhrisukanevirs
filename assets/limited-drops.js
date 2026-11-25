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
];
export const limitedDrops = editions.map(item => ({
  ...item, weight:'100 г', category:'лимитированные',
  image:new URL('../images/drop-' + ({sus:'sus', eclipse:'a4'})[item.id] + '.webp', import.meta.url).href
}));

const everyday = [
  ['cheese','Сырный хруст','Выдержанный сыр и тонкие золотистые ломтики.','#ffbd36'],
  ['cream','Сметана и зелень','Нежная сметана, укроп и немного зелёного лука.','#a3e466'],
  ['crab','Краб','Сладковатый вкус краба с морской солью.','#ff847d'],
  ['tomato','Томат и паприка','Спелые томаты и дымная сладкая паприка.','#ff735e'],
  ['salt','Морская соль','Тонкий картофельный ломтик и хрустящие кристаллы соли.','#7ddcff'],
  ['bacon','Бекон и лук','Копчёный бекон и сладкий жареный лук.','#ffac66']
];
export const everydayChips = everyday.map(([id,name,description,color])=>({
  id,name,description,color,category:'классические',weight:'100 г',price:139,spiceLevel:0,
  image:new URL('../images/drop-'+id+'.webp', import.meta.url).href
}));
