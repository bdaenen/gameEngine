(function(e){function t(t){var n=t.handler,r=(t.namespace||"").toLowerCase().split(" ");r=e.map(r,function(e){return e.split(".")});if(r.length===1&&(r[0]===""||r[0]==="autocomplete")){return}t.handler=function(t){if(this!==t.target&&(/textarea|select/i.test(t.target.nodeName)||t.target.type==="text"||$(t.target).prop("contenteditable")=="true")){return}var i=t.type!=="keypress"&&e.hotkeys.specialKeys[t.which],s=String.fromCharCode(t.which).toLowerCase(),o,u="",a={};if(t.altKey&&i!=="alt"){u+="alt_"}if(t.ctrlKey&&i!=="ctrl"){u+="ctrl_"}if(t.metaKey&&!t.ctrlKey&&i!=="meta"){u+="meta_"}if(t.shiftKey&&i!=="shift"){u+="shift_"}if(i){a[u+i]=true}else{a[u+s]=true;a[u+e.hotkeys.shiftNums[s]]=true;if(u==="shift_"){a[e.hotkeys.shiftNums[s]]=true}}for(var f=0,l=r.length;f<l;f++){if(a[r[f]]){return n.apply(this,arguments)}}}}e.hotkeys={version:"0.8+",specialKeys:{8:"backspace",9:"tab",13:"return",16:"shift",17:"ctrl",18:"alt",19:"pause",20:"capslock",27:"esc",32:"space",33:"pageup",34:"pagedown",35:"end",36:"home",37:"left",38:"up",39:"right",40:"down",45:"insert",46:"del",96:"0",97:"1",98:"2",99:"3",100:"4",101:"5",102:"6",103:"7",104:"8",105:"9",106:"*",107:"+",109:"-",110:".",111:"/",112:"f1",113:"f2",114:"f3",115:"f4",116:"f5",117:"f6",118:"f7",119:"f8",120:"f9",121:"f10",122:"f11",123:"f12",144:"numlock",145:"scroll",188:",",190:".",191:"/",224:"meta"},shiftNums:{"`":"~",1:"!",2:"@",3:"#",4:"$",5:"%",6:"^",7:"&",8:"*",9:"(",0:")","-":"_","=":"+",";":": ","'":'"',",":"<",".":">","/":"?","\\":"|"}};e.each(["keydown","keyup","keypress"],function(){e.event.special[this]={add:t}})})(jQuery)
