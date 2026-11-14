// Entry leads the soundtrack impact so the badge reaches its overshoot on the beat.
export const RANK_PRESENTATION = [
  {id:'iron',theme:'forge',impact:.13,entry:0,duration:1.55,signature:'FORGED IN EFFORT'},
  {id:'bronze',theme:'ember',impact:.34,entry:0,duration:2.05,signature:'THE SPARK IGNITES'},
  {id:'silver',theme:'tempest',impact:.26,entry:0,duration:2.20,signature:'BREAK THE LIMIT'},
  {id:'gold',theme:'solar',impact:.49,entry:0,duration:2.70,signature:'CLAIM YOUR GLORY'},
  {id:'platinum',theme:'aurora',impact:.68,entry:.155,duration:2.80,signature:'RISE ABOVE'},
  {id:'diamond',theme:'prism',impact:.57,entry:.03,duration:3.15,signature:'PRESSURE INTO POWER'},
  {id:'elite',theme:'void',impact:.90,entry:.1025,duration:3.40,signature:'ENTER THE ELITE'},
  {id:'master',theme:'sovereign',impact:1.0,entry:.44,duration:4.10,signature:'MASTER YOUR LEGACY'},
  {id:'legend',theme:'eclipse',impact:1.15,entry:.214,duration:5.20,signature:'BECOME LEGEND'},
] as const;
