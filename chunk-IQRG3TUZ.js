function t(r){if(r==null||r==="")return null;if(typeof r=="number")return Number.isNaN(r)?null:String(r);let o=String(r).trim();return!o||o.toLowerCase()==="nan"?null:o}export{t as a};
