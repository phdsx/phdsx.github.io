/* 32px blocks, each split into four 16px collision tiles.
   . empty, B brick, S steel, W water, G foliage. */
(function(root){
  'use strict';
  const levels=[
    {name:'砖墙防线',total:12,cap:4,interval:2.8,rows:[
      '.............','..B.B...B.B..','..B.B.S.B.B..','..B.B...B.B..',
      '......B......','.BB...B...BB.','....GG.GG....','.B..WW.WW..B.',
      '.B.........B.','...B.....B...','...B..B..B...','.....BBB.....','.....B.B.....']},
    {name:'河道突围',total:16,cap:5,interval:2.4,rows:[
      '.............','.B..B...B..B.','.BS.B.G.B.SB.','.B..B.G.B..B.',
      '...WW...WW...','.B.WW.B.WW.B.','.B....B....B.','...S.....S...',
      '.GG..BBB..GG.','.B.........B.','...BB...BB...','.....BBB.....','.....B.B.....']},
    {name:'钢铁要塞',total:20,cap:6,interval:2,rows:[
      '.............','.B.B..S..B.B.','.B.B..S..B.B.','...B.....B...',
      '.WW..B.B..WW.','.WW..B.B..WW.','....GG.GG....','.SB.......BS.',
      '..B.S...S.B..','..B..BBB..B..','...B.....B...','.....BBB.....','.....B.B.....']}
  ];
  const api={levels,create(index){return levels[index].rows.flatMap(row=>{
    const a=[...row].flatMap(c=>[c,c]);return [a.slice(),a.slice()];
  });}};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.TankMaps=api;
})(typeof window!=='undefined'?window:globalThis);
