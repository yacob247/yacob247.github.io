import { up, run, mkc, T_ } from './h.mjs';
const results = []; let pass=0, fail=0;
function rec(tool, ok, note){ results.push({tool, ok, note}); ok?pass++:fail++; console.log((ok?'PASS ':'FAIL ')+tool+(note?' — '+String(note).slice(0,160):'')); }
// test images
function photo(w=320,h=240){ const c=mkc(w,h), x=c.getContext('2d'); const g=x.createLinearGradient(0,0,w,h); g.addColorStop(0,'#2a6df4'); g.addColorStop(.5,'#f4b22a'); g.addColorStop(1,'#c2185b'); x.fillStyle=g; x.fillRect(0,0,w,h); x.fillStyle='#fff'; x.beginPath(); x.arc(w*.35,h*.45,50,0,7); x.fill(); x.fillStyle='#145a32'; x.fillRect(w*.55,h*.3,90,110); const d=x.getImageData(0,0,w,h); for(let i=0;i<d.data.length;i+=4){const n=(Math.random()-.5)*30; d.data[i]+=n; d.data[i+1]+=n; d.data[i+2]+=n;} x.putImageData(d,0,0); return c; }
function logo(){ const c=mkc(200,200), x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,200,200); x.fillStyle='#e53935'; x.beginPath(); x.arc(100,100,70,0,7); x.fill(); x.fillStyle='#1e88e5'; x.fillRect(70,70,60,60); return c; }
function alphaImg(){ const c=mkc(150,150), x=c.getContext('2d'); x.fillStyle='#43a047'; x.beginPath(); x.arc(75,75,60,0,7); x.fill(); return c; }
const P = async (c,n,t='image/png')=> up(n, await c.encode(t==='image/png'?'png':'jpeg', t==='image/png'?undefined:90), t);
const ph = await P(photo(),'photo.png'), phj = await P(photo(),'photo.jpg','image/jpeg'), lg = await P(logo(),'logo.png'), al = await P(alphaImg(),'alpha.png');
const ph2 = await P(photo(200,200),'photo2.png');
const out = async (tool,args,check)=>{ const r = await run(tool,args); let ok=false,note=''; try{ ok = r.ok!==false && (!check || !!(await check(r))); note = r.ok===false ? r.error : ''; }catch(e){ ok=false; note='check threw '+e.message; } rec(tool, ok, note); return r; };
const fileOf = r => r.output_files?.[0];
// ── conversion
for (const [t,f] of [['convert_image_webp','webp'],['convert_image_png','png'],['convert_image_jpeg','jpeg'],['convert_image_avif','avif'],['convert_image_bmp','bmp'],['convert_image_gif','gif']]) await out(t,{file_id:ph},r=>r.output_format===f && r.output_bytes>0);
await out('convert_image_format',{file_id:al,format:'ico'},r=>r.output_format==='ico');
await out('convert_image_format',{file_ids:[ph,lg],format:'jpeg'},r=>r.processed===2);
await out('convert_image_svg',{file_id:lg,mode:'trace',colors:4},r=>r.vectorized && r.paths>=1);
await out('convert_image_svg',{file_id:lg,mode:'embed'},r=>r.vectorized===false);
await out('image_to_data_url',{file_id:lg,include_data:true},r=>String(r.data_url||'').startsWith('data:image/png;base64,'));
await out('image_to_blob',{file_id:ph,format:'webp'},r=>r.blob_type==='image/webp');
// resize
await out('resize_image',{file_id:ph,width:100},r=>r.width===100&&r.height===75);
await out('resize_image_percentage',{file_id:ph,percent:50},r=>r.width===160&&r.height===120);
await out('resize_image_fit',{file_id:ph,width:100,height:100,pad:true},r=>r.width===100&&r.height===100);
await out('resize_image_fill',{file_id:ph,width:100,height:100,focus:'smart'},r=>r.width===100&&r.height===100);
await out('scale_image',{file_id:ph,factor:2},r=>r.width===640);
await out('get_image_dimensions',{file_id:ph},r=>r.width===320&&r.height===240&&r.aspect_ratio==='4:3');
await out('get_image_metadata',{file_id:ph},r=>r.format==='png'&&r.color_type);
await out('calculate_image_aspect_ratio',{width:1920,height:1080,target_width:640},r=>r.ratio==='16:9'&&r.for_target_width.height===360);
await out('generate_image_thumbnail',{file_id:ph,sizes:[64,128]},r=>r.thumbnails.length===2&&r.zip_file_id);
await out('generate_image_preview',{file_id:ph,max_dimension:100},r=>r.width===100&&r.lqip_data_url);
// edit
await out('crop_image',{file_id:ph,x:10,y:10,width:100,height:50},r=>r.width===100&&r.height===50);
await out('crop_image',{file_id:ph,mode:'aspect',aspect:'1:1'},r=>r.width===240&&r.height===240);
await out('crop_image',{file_id:lg,mode:'trim'},r=>r.width<200 || r.trimmed===false);
await out('rotate_image',{file_id:ph,angle:90},r=>r.width===240&&r.height===320);
await out('rotate_image',{file_id:ph,angle:30},r=>r.width>320);
await out('flip_image',{file_id:ph,direction:'horizontal'},r=>true);
for (const t of ['adjust_image_brightness','adjust_image_contrast','adjust_image_saturation','adjust_image_sharpness']) await out(t,{file_id:ph,amount:30},r=>r.amount===30);
await out('adjust_image_exposure',{file_id:ph,stops:1},r=>r.stops===1);
await out('apply_image_grayscale',{file_id:ph},r=>true); await out('apply_image_sepia',{file_id:ph},r=>true);
await out('apply_image_blur',{file_id:ph,radius:3},r=>true); await out('apply_image_blur',{file_id:ph,x:0,y:0,width:50,height:50},r=>r.region);
await out('apply_image_sharpen',{file_id:ph},r=>true);
await out('apply_image_filters',{file_id:ph,filters:['sepia',{name:'blur',value:2},'vintage','emboss']},r=>r.applied.length===4);
await out('add_image_watermark',{file_id:ph,text:'DRAFT',position:'tile'},r=>r.placements>1);
await out('add_image_watermark',{file_id:ph,watermark_file_id:lg,position:'bottom-right'},r=>r.type==='image');
await out('add_image_text',{file_id:ph,text:'Hello\nWorld',position:'center',background_color:'#000000',max_width_percent:80},r=>r.lines===2);
await out('remove_image_background',{file_id:lg,method:'color'},async r=>{ return r.foreground_percent>20 && r.foreground_percent<80; });
{ const r=await run('remove_image_background',{file_id:ph}); rec('remove_image_background (busy photo → honest UNAVAILABLE)', r.ok===false&&r.code==='UNAVAILABLE', r.code); }
await out('change_image_background',{file_id:lg,method:'color',background_color:'#00ff00'},r=>r.background==='color');
await out('round_image_corners',{file_id:ph,radius:30},r=>r.radius_px===30);
await out('round_image_corners',{file_id:ph,shape:'circle'},r=>r.width===240);
await out('add_image_border',{file_id:ph,width:10,color:'#ff0000'},r=>r.new_size.width===340);
await out('add_image_border',{file_id:ph,width:12,style:'double',color:'#000',color2:'#fff'},r=>true);
for (const l of ['horizontal','vertical','grid','overlay']) await out('merge_images',{file_ids:[ph,ph2,lg],layout:l},r=>r.images_merged===3);
// compress
await out('compress_image',{file_id:phj,quality:50},r=>r.format==='jpeg'&&r.output_bytes<=r.original_bytes);
await out('compress_image',{file_id:lg,format:'png',png_colors:16},r=>r.output_bytes>0);
await out('optimize_image',{file_id:ph},r=>r.candidates.length>0&&r.output_bytes>0);
await out('reduce_image_file_size',{file_id:phj,reduce_by_percent:50},r=>r.reached_target);
await out('compress_image_to_target_size',{file_id:phj,target_kb:8},r=>r.output_bytes<=8*1024);
await out('compress_image_to_target_size',{file_id:ph,target_kb:20,format:'png'},r=>r.output_bytes<=20*1024);
{ const r=await run('compress_image_to_target_size',{file_id:phj,target_bytes:200}); rec('compress_image_to_target_size (impossible target → honest ok:false)', r.ok===false&&r.reached_target===false&&!!r.warning, r.warning); }
await out('optimize_image_for_web',{file_id:ph,widths:[100,200]},r=>r.variants.length===2&&r.html);
await out('optimize_image_for_social_media',{file_id:ph,platform:'instagram_square'},r=>r.width===1080&&r.height===1080);
await out('optimize_image_for_social_media',{file_id:ph,platform:'twitter_post',fit:'contain'},r=>r.width===1600);
await out('strip_image_metadata',{file_id:phj},r=>r.format==='jpeg'&&r.verified_decodable);
await out('strip_image_metadata',{file_id:ph},r=>r.format==='png');
await out('preserve_image_quality_compression',{file_id:phj,min_ssim:0.95},r=>r.ssim>=0.95);
await out('preserve_image_quality_compression',{file_id:lg},r=>r.mode==='lossless');
// advanced
await out('segment_image',{file_id:ph,k:4,cutouts:true},r=>r.segments.length>=2&&r.cutouts_zip_file_id);
await out('detect_image_edges',{file_id:lg},r=>r.edge_pixel_percent>0);
await out('detect_image_edges',{file_id:lg,method:'sobel',overlay:true},r=>true);
await out('extract_image_colors',{file_id:lg,count:3},r=>r.colors.length>=2);
await out('generate_color_palette',{file_id:ph},r=>r.colors.length>=3);
await out('generate_color_palette',{base_color:'#3366cc',scheme:'triadic'},r=>r.colors.length>=3&&r.accessibility.length);
await out('detect_image_regions',{file_id:lg,k:3},r=>r.region_count>=2);
await out('remove_image_noise',{file_id:ph},r=>r.estimated_noise_after < r.estimated_noise_before);
await out('upscale_image',{file_id:lg,scale:2},r=>r.width===400);
{ const r=await run('upscale_image',{file_id:lg,method:'ai'}); rec('upscale_image method:ai (no engine → honest UNAVAILABLE)', r.ok===false&&r.code==='UNAVAILABLE', r.code); }
await out('enhance_image_quality',{file_id:ph},r=>r.applied.length>0);
await out('restore_image',{file_id:ph},r=>r.applied.length>0);
import fs from 'fs';
globalThis.__rec = results;
fs.writeFileSync('/tmp/it/res1.json', JSON.stringify(results));
console.log('\nPASS',pass,'FAIL',fail);
