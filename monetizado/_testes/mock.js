var DB = { perfis:[{id:1,user_id:'u1',nome:'Maria Professora',unidade:'Sesi Tubarao',groq_api_key:'gsk_abc',groq_model:'openai/gpt-oss-120b',credito_inicial:3,is_admin:false,criado_em:new Date().toISOString()}], planos:[{id:1,nome:'Basico',creditos:50,preco_centavos:1500,destaque:false,ordem:1},{id:2,nome:'Popular',creditos:150,preco_centavos:3900,destaque:true,ordem:2}], pedidos_pix:[], seq:100 };
var curUser = 'u1';
function fakeChain(q){
  q._select=null; q._eq=[]; q._insert=null; q._update=null; q._single=false; q._maybeSingle=false;
  q.select=function(c){this._select=c;return this;};
  q.eq=function(k,v){this._eq.push([k,v]);return this;};
  q.order=function(){return this;};
  q.limit=function(){return this;};
  q.single=function(){this._single=true;return this;};
  q.maybeSingle=function(){this._maybeSingle=true;return this;};
  q.insert=function(r){this._insert=r;return this;};
  q.update=function(r){this._update=r;return this;};
  q.then=function(ok,bad){
    var self=this, res={data:null,error:null};
    try{
      if(self._insert){ var row=Object.assign({id:++DB.seq,status:'aguardando',user_id:curUser,criado_em:new Date().toISOString()},self._insert); DB[self._table].push(row); res.data=row; }
      else if(self._update){ var t=DB[self._table].find(function(r){return r.user_id===curUser;}); if(t) Object.assign(t,self._update); res.data=t; }
      else { var rows=DB[self._table].slice(); self._eq.forEach(function(p){rows=rows.filter(function(r){return r[p[0]]===p[1];});}); res.data=rows; }
    }catch(e){ res.error={message:e.message}; }
    var prom=Promise.resolve(res);
    if(self._single||self._maybeSingle) prom=prom.then(function(r){ if(Array.isArray(r.data)) r.data=r.data[0]||null; return r; });
    prom.then(ok,bad);
  };
  return q;
}
function rpc(name,args){
  if(name==='consumir_creditos'){ var p=DB.perfis.find(function(x){return x.user_id===curUser;}); if(!p) return Promise.resolve({data:null,error:{message:'Perfil nao encontrado'}}); if(p.credito_inicial<args.p_qtd) return Promise.resolve({data:null,error:{message:'CREDITOS_INSUFICIENTES:'+p.credito_inicial}}); p.credito_inicial-=args.p_qtd; return Promise.resolve({data:p.credito_inicial,error:null}); }
  if(name==='listar_pedidos_pendentes') return Promise.resolve({data:DB.pedidos_pix.map(function(x){ return { pedido_id:x.id, referencia:x.referencia, status:x.status, valor_centavos:x.valor_centavos, creditos:x.creditos, plano_nome:'Basico', criado_em:x.criado_em||new Date().toISOString(), user_email:'maria@edu.sesisc.org.br', user_nome:'Maria Professora' }; }),error:null});
  if(name==='listar_usuarios_admin') return Promise.resolve({data:DB.perfis,error:null});
  if(name==='aprovar_pedido_pix'){ var ped=DB.pedidos_pix.find(function(x){return x.id===args.p_pedido_id;}); if(ped){ ped.status=args.p_aprovar?'aprovado':'recusado'; if(args.p_aprovar){ var alvo=DB.perfis.find(function(x){return x.user_id===ped.user_id;}); if(alvo) alvo.credito_inicial+=ped.creditos; } } return Promise.resolve({data:true,error:null}); }
  if(name==='ajustar_creditos'){ var p2=DB.perfis.find(function(x){return x.user_id===args.p_user_id;}); if(p2) p2.credito_inicial+=args.p_qtd; return Promise.resolve({data:p2?p2.credito_inicial:0,error:null}); }
  return Promise.resolve({data:null,error:{message:'rpc: '+name}});
}
window.supabase={createClient:function(){return { auth:{ getSession:function(){return Promise.resolve({data:{session:{user:{email:'maria@edu.sesisc.org.br'}}},error:null});}, signOut:function(){return Promise.resolve({error:null});}, signInWithPassword:function(){return Promise.resolve({error:null});}, signUp:function(){return Promise.resolve({data:{session:{user:{email:'x@x.com'}}},error:null});} }, from:function(t){return fakeChain({_table:t});}, rpc:rpc };}};
