export function createReviewSheet({columns=6,cellWidth=300,cellHeight=350,count,title}){
 const heading=58,labelHeight=44,rows=Math.ceil(count/columns);
 const canvas=document.createElement('canvas');canvas.width=columns*cellWidth;canvas.height=heading+rows*(cellHeight+labelHeight);
 const ctx=canvas.getContext('2d');ctx.fillStyle='#ded9d0';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle='#534c40';ctx.font='22px Georgia';ctx.fillText(title,24,36);
 return {cellWidth,cellHeight,canvas,add(image,label,index){const x=(index%columns)*cellWidth,y=heading+Math.floor(index/columns)*(cellHeight+labelHeight);ctx.drawImage(image,x,y,cellWidth,cellHeight);ctx.fillStyle='#544b3d';ctx.font='13px system-ui';ctx.textAlign='center';ctx.fillText(label,x+cellWidth/2,y+cellHeight+24);},
  async save(name){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));const response=await fetch('/__capture/'+name+'.png',{method:'POST',body:blob});if(!response.ok)throw new Error('Review sheet save failed: '+name);return '/outputs/fantasy-studio/review/'+name+'.png';},
 };
}
