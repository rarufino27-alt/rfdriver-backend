(function(){

const read = (k,d)=>JSON.parse(localStorage.getItem(k)) ?? d;
const write = (k,v)=>localStorage.setItem(k,JSON.stringify(v));

window.DataManager = {

  get(key, def=[]){
    return read(key, def);
  },

  set(key, value){
    write(key, value);
  },

  add(key, item){
    const data = read(key, []);
    data.push(item);
    write(key, data);
  },

  remove(key, index){
    const data = read(key, []);
    data.splice(index,1);
    write(key, data);
  }

};

})();
