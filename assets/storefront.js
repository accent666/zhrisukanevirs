const filters = [['all','Все'],['классические','Классика'],['лимитированные','Лимитки'],['острые','Острые'],['мясные','Мясные'],['концептуальные','Необычные']];
const creators = {sus:'Супер Сус',lit:'Михаил Литвин',eclipse:'Влад А4'};
const photoSources = [
  ['Супер Сус · Фокус','https://focus.ua/ratings/481700-top-50-blogerov-ukrainy-rejting-fokusa/grupa-7/2758/super-sus-vitaliy-lushkov'],
  ['Михаил Литвин · 24СМИ','https://24smi.org/celebrity/100883-mikhail-litvin.html'],
  ['Влад А4 · Узнай Всё','https://uznayvse.ru/znamenitosti/biografiya-vlad-bumaga.html'],
];
export function storefront(React, Link, useLocation, useNavigate, Brand, products, useCart, useUser, icons, Wholesale, MapSection) {
  const h=React.createElement;
  const {useState,useEffect}=React;
  const byId=id=>products.find(p=>p.id===id);
  const link=(to,label,cls)=>h(Link,{to,className:cls},label);
  const image=name=>new URL('../images/'+name,import.meta.url).href;
  const games=[['/club/#cases','Кейсы'],['/club/#upgrade','Апгрейдер']];
  function Header() {
    const {pathname,hash}=useLocation();
    const {totalItems,setIsCartOpen}=useCart();
    const {user,setIsAuthOpen}=useUser();
    useEffect(()=>{
      if (!hash) {window.scrollTo({top:0,behavior:'instant'});return;}
      const find=()=>{
        const target=document.getElementById(hash.slice(1));
        if(target){target.scrollIntoView({behavior:'instant'});return true;}
      };
      if(find())return;
      const observer=new MutationObserver(()=>{if(find())observer.disconnect();});
      observer.observe(document.getElementById('root'),{childList:true,subtree:true});
      return ()=>observer.disconnect();
    },[pathname,hash]);
    return h('header',{className:'store-head'},h('div',{className:'head-inner'},
      h(Brand),
      h('nav',{'aria-label':'Основная навигация'},...[['/catalog','Вкусы'],...games,['/customers','Покупатели']].map(([to,label])=>h(Link,{key:to,to,'aria-current':(pathname.replace(/\/$/,'')+hash)===to?'page':undefined},label))),
      h('div',{className:'head-tools'},
        h('button',{type:'button',onClick:()=>setIsCartOpen(true),'aria-label':'Корзина'},h(icons.cart),totalItems>0&&h('b',null,totalItems)),
        user?h(Link,{to:'/profile','aria-label':'Личный кабинет'},h(icons.user)):
          h('button',{type:'button',onClick:()=>setIsAuthOpen(true),'aria-label':'Войти или зарегистрироваться'},h(icons.user)))));
  }
  function Hero(){
    return h('section',{className:'store-hero'},h('div',{className:'hero-copy'},
      h('h1',null,'Начос',h('br'),' из ',h('em',null,'бездны')),
      h('p',null,'Впился зубом — пропал рассудок!'),
      h('div',{className:'hero-links'},link('/catalog','Выбрать вкус','acid-button'),link('/club/#cases','Открыть кейс','outline-button'),link('/club/#upgrade','Апгрейдер','outline-button'))),
      h(Link,{to:'/catalog?series=fan',className:'hero-packs','aria-label':'Открыть фанатскую серию'},
        h('img',{className:'pack-lit',src:byId('lit').image,alt:'LITЖрисука с Михаилом Литвиным',width:720,height:960}),
        h('img',{className:'pack-sus',src:byId('sus').image,alt:'ЖрисукаСус с Супер Сусом',width:720,height:960}),
        h('span',null,'Фанатская серия ↗')));
  }
  function Catalog(){
    const location=useLocation();
    const navigate=useNavigate();
    const params=new URLSearchParams(location.search);
    const requested=params.get('series')==='fan'?'лимитированные':params.get('taste');
    const filter=filters.some(([id])=>id===requested)?requested:'all';
    function setFilter(id) {
      params.delete('series');
      params.delete('taste');
      if (id==='лимитированные') params.set('series','fan');
      else if (id!=='all') params.set('taste',id);
      navigate({pathname:location.pathname,search:params.toString(),hash:location.hash},{replace:true,preventScrollReset:true});
    }
    const {addToCart}=useCart();
    const sorted=['sus','lit','eclipse',...products.filter(p=>p.category==='классические').map(p=>p.id),...products.filter(p=>!creators[p.id] && p.category!=='классические').map(p=>p.id)].map(byId);
    const visible=filter==='all'?sorted:sorted.filter(p=>p.category===filter);
    return h('section',{className:'store-catalog store-width',id:'catalog'},
      h('div',{className:'section-title'},h(location.pathname.startsWith('/catalog')?'h1':'h2',null,'Наши вкусы'),h('span',{'aria-live':'polite'},visible.length+' / '+products.length)),
      h('div',{className:'filter-row',role:'group','aria-label':'Фильтр вкусов'},...filters.map(([id,label])=>h('button',{key:id,type:'button','aria-pressed':filter===id,onClick:()=>setFilter(id)},label))),
      h('div',{className:'pack-grid'},...visible.map(p=>h('article',{key:p.id,className:'den-catalog-card pack-card',style:{'--ink':p.color}},
        h('img',{src:p.image,alt:p.name,loading:'lazy',decoding:'async',width:480,height:640}),
        h('div',{className:'pack-body'},h('small',null,creators[p.id]?'Фан-серия / '+creators[p.id]:p.category+' / '+p.weight),h('h3',null,p.name),
          h('p',null,p.description),h('div',{className:'pack-buy'},h('strong',null,p.price+' ₽'),h('button',{onClick:()=>addToCart(p)},'В корзину')))))));
  }
  function GameLinks(){
    return h('section',{className:'store-width game-links'},h('h2',null,'Игровой клуб'),
      h('div',null,...games.map(([to,label],i)=>h(Link,{to,key:to},
        h('img',{src:i?byId('lit').image:image('crate.webp'),loading:'lazy',alt:''}),
        h('div',null,h('h3',null,label),h('p',null,i?'Повышай ранг собранных пачек за крошки.':'Открывай бесплатные кейсы и собирай вкусы.'))))));
  }
  function Home(){
    const {hash}=useLocation();
    const [info,setInfo]=useState('');
    useEffect(()=>{if(['#wholesale','#map'].includes(hash))setInfo(hash.slice(1));},[hash]);
    return h('main',null,h(Hero),h(GameLinks),h(Catalog),h('section',{className:'store-width store-info'},
      h('h2',null,'Клуб и контакты'),
      h('div',{className:'info-actions'},link('/customers','Наши постоянные покупатели ↗','outline-button'),
        ...[['wholesale','Оптовикам'],['map','Где купить']].map(([id,label])=>h('button',{key:id,'aria-expanded':info===id,onClick:()=>setInfo(info===id?'':id)},label))),
      info==='wholesale'&&h(Wholesale),info==='map'&&h(MapSection)),
      h('footer',{className:'store-width store-foot',id:'footer'},h('span',null,'ЖРИСУКА · Фан-проект'),
        h('details',null,h('summary',null,'Фото для иллюстраций'),...photoSources.map(([title,url])=>h('a',{key:url,href:url},title)))));
  }
  return {Header,Home,Catalog};
}
