(function(){
  var $=function(id){return document.getElementById(id)};
  var cv=$('c'),ctx=cv.getContext('2d');
  var cw=0,ch=0;
  var PAD={l:34,r:16,t:16,b:30};
  var shots=[],flying=null,paused=false,hits=0,total=0,target={x:40,r:2},last=0;

  function fmt(n,d){return n.toFixed(d==null?1:d).replace('.',',')}
  function css(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}

  function P(){
    var deg=+$('ang').value;
    return {deg:deg,a:deg*Math.PI/180,v:+$('spd').value,h:+$('hgt').value,g:+$('grav').value};
  }
  function theory(p){
    var vx=p.v*Math.cos(p.a),vy=p.v*Math.sin(p.a);
    var T=(vy+Math.sqrt(vy*vy+2*p.g*p.h))/p.g;
    return {vx:vx,vy:vy,T:T,R:vx*T,H:p.h+vy*vy/(2*p.g)};
  }
  function pos(p,th,t){return {x:th.vx*t,y:Math.max(0,p.h+th.vy*t-p.g*t*t/2)}}

  function newTarget(){
    target.x=10+Math.round(Math.random()*18)*5;
    $('msg').className='msg';
    $('msg').textContent='Нысана '+target.x+' м қашықтықта.';
    draw();
  }

  function resize(){
    var dpr=window.devicePixelRatio||1,r=cv.getBoundingClientRect();
    cw=r.width;ch=r.height;cv.width=cw*dpr;cv.height=ch*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);draw();
  }

  function view(){
    var th=theory(P());
    var W=Math.max(th.R,target.x+target.r+4,30),H=Math.max(th.H,12);
    shots.forEach(function(s){W=Math.max(W,s.th.R);H=Math.max(H,s.th.H)});
    W*=1.1;H*=1.25;
    var sc=Math.min((cw-PAD.l-PAD.r)/W,(ch-PAD.t-PAD.b)/H);
    return {sc:sc,W:W,th:th};
  }
  function niceStep(x){
    var p=Math.pow(10,Math.floor(Math.log10(x))),m=x/p;
    return (m<1.5?1:m<3.5?2:m<7.5?5:10)*p;
  }

  function draw(){
    if(!cw)return;
    var v=view(),sc=v.sc,p=P();
    var X=function(x){return PAD.l+x*sc},Y=function(y){return ch-PAD.b-y*sc};
    var g=ctx.createLinearGradient(0,0,0,ch);g.addColorStop(0,css('--sky1'));g.addColorStop(1,css('--sky2'));
    ctx.fillStyle=g;ctx.fillRect(0,0,cw,ch);
    ctx.fillStyle=css('--ground');ctx.fillRect(0,Y(0),cw,ch-Y(0));

    ctx.font='11px Roboto,sans-serif';ctx.textAlign='center';
    var step=niceStep((cw-PAD.l-PAD.r)/sc/6);
    ctx.strokeStyle=css('--grid');ctx.fillStyle=css('--muted');ctx.lineWidth=1;
    for(var x=0;x<=v.W;x+=step){
      ctx.globalAlpha=.25;ctx.beginPath();ctx.moveTo(X(x),PAD.t);ctx.lineTo(X(x),Y(0));ctx.stroke();
      ctx.globalAlpha=1;ctx.fillText(x+' м',X(x),ch-10);
    }
    ctx.textAlign='right';
    var ys=niceStep((ch-PAD.t-PAD.b)/sc/4);
    for(var y=ys;Y(y)>PAD.t;y+=ys){
      ctx.globalAlpha=.25;ctx.beginPath();ctx.moveTo(PAD.l,Y(y));ctx.lineTo(cw-PAD.r,Y(y));ctx.stroke();
      ctx.globalAlpha=1;ctx.fillText(y,PAD.l-5,Y(y)+4);
    }
    ctx.globalAlpha=1;

    ctx.strokeStyle=css('--text');ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(PAD.l,Y(0));ctx.lineTo(cw-PAD.r,Y(0));ctx.stroke();

    // target
    var acc=css('--acc');
    ctx.fillStyle=acc;ctx.fillRect(X(target.x-target.r),Y(0)-4,2*target.r*sc,8);
    ctx.strokeStyle=acc;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(X(target.x),Y(0));ctx.lineTo(X(target.x),Y(0)-26);ctx.stroke();
    ctx.fillStyle=acc;ctx.beginPath();ctx.moveTo(X(target.x),Y(0)-26);ctx.lineTo(X(target.x)+14,Y(0)-20);ctx.lineTo(X(target.x),Y(0)-14);ctx.fill();

    // cannon
    ctx.fillStyle=css('--muted');
    if(p.h>0)ctx.fillRect(X(0)-6,Y(p.h),12,Y(0)-Y(p.h));
    ctx.strokeStyle=css('--text');ctx.lineWidth=6;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(X(0),Y(p.h));ctx.lineTo(X(0)+28*Math.cos(p.a),Y(p.h)-28*Math.sin(p.a));ctx.stroke();
    ctx.lineCap='butt';
    ctx.fillStyle=css('--text');ctx.beginPath();ctx.arc(X(0),Y(p.h),8,0,7);ctx.fill();

    // theory curve
    if($('theory').checked){
      var th=v.th;
      ctx.setLineDash([6,5]);ctx.strokeStyle=acc;ctx.lineWidth=2;ctx.beginPath();
      for(var i=0;i<=60;i++){var q=pos(p,th,th.T*i/60);if(i)ctx.lineTo(X(q.x),Y(q.y));else ctx.moveTo(X(q.x),Y(q.y))}
      ctx.stroke();ctx.setLineDash([]);
    }

    // past shots
    var shotC=css('--shot');
    shots.forEach(function(s){
      ctx.globalAlpha=.35;ctx.strokeStyle=shotC;ctx.lineWidth=2;ctx.beginPath();
      s.pts.forEach(function(q,i){if(i)ctx.lineTo(X(q.x),Y(q.y));else ctx.moveTo(X(q.x),Y(q.y))});
      ctx.stroke();ctx.globalAlpha=1;
      var e=s.pts[s.pts.length-1];
      ctx.fillStyle=s.hit?css('--ok'):shotC;ctx.beginPath();ctx.arc(X(e.x),Y(0),4,0,7);ctx.fill();
    });

    // active shot
    if(flying){
      ctx.strokeStyle=shotC;ctx.lineWidth=3;ctx.beginPath();
      flying.pts.forEach(function(q,i){if(i)ctx.lineTo(X(q.x),Y(q.y));else ctx.moveTo(X(q.x),Y(q.y))});
      ctx.stroke();
      var c=flying.pts[flying.pts.length-1];
      ctx.fillStyle=acc;ctx.beginPath();ctx.arc(X(c.x),Y(c.y),7,0,7);ctx.fill();
    }
  }

  function stats(){
    var th=theory(P());
    $('s-range').textContent=fmt(th.R)+' м';
    $('s-h').textContent=fmt(th.H)+' м';
    $('s-t').textContent=fmt(th.T)+' с';
    $('s-hits').textContent=hits+' / '+total;
    $('o-ang').textContent=$('ang').value+'°';
    $('o-spd').textContent=$('spd').value+' м/с';
    $('o-hgt').textContent=$('hgt').value+' м';
  }

  function fire(){
    if(flying)return;
    var p=P(),th=theory(p);
    flying={p:p,th:th,t:0,ts:Math.max(1,th.T/5),pts:[{x:0,y:p.h}]};
    paused=false;$('pause').textContent='Тоқтату';
    $('fire').disabled=true;last=0;
    requestAnimationFrame(loop);
  }

  function loop(ts){
    if(!flying)return;
    if(!last)last=ts;
    var dt=Math.min(.05,(ts-last)/1000);last=ts;
    if(!paused){
      flying.t=Math.min(flying.th.T,flying.t+dt*flying.ts);
      flying.pts.push(pos(flying.p,flying.th,flying.t));
    }
    draw();
    if(flying.t>=flying.th.T){land();return}
    requestAnimationFrame(loop);
  }

  function land(){
    var f=flying,e=f.pts[f.pts.length-1],dx=e.x-target.x,hit=Math.abs(dx)<=target.r;
    total++;if(hit)hits++;
    shots.push({pts:f.pts,th:f.th,hit:hit});
    if(shots.length>8)shots.shift();
    flying=null;$('fire').disabled=false;
    var m=$('msg');
    if(hit){m.className='msg hit';m.textContent='Тидің! Ауытқу: '+fmt(Math.abs(dx))+' м.'}
    else{m.className='msg miss';m.textContent=(dx>0?'Асып кетті':'Жетпеді')+': нысана '+target.x+' м жерде, снаряд '+fmt(e.x)+' м жерге түсті.'}
    stats();draw();
  }

  ['ang','spd','hgt','grav','theory'].forEach(function(id){
    $(id).addEventListener('input',function(){stats();if(!flying)draw()});
  });
  $('fire').addEventListener('click',fire);
  $('pause').addEventListener('click',function(){
    if(!flying)return;
    paused=!paused;this.textContent=paused?'Жалғастыру':'Тоқтату';
  });
  $('clear').addEventListener('click',function(){shots=[];hits=0;total=0;stats();draw()});
  $('target').addEventListener('click',function(){if(!flying){newTarget()}});
  window.addEventListener('resize',resize);

  stats();resize();newTarget();
})();
