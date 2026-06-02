// Constantes e estado compartilhado entre módulos.
const VERSION = '2.6.0';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbycoqE3qUIILWmzk1SUyuMBg0kphSFajOwkHqQRPwNAaOSgpBu_2FP18diwebM3E_DJHw/exec';
const AVATAR_COLORS=[{bg:'#EDE9F6',txt:'#3D2B69'},{bg:'#D8F3DC',txt:'#2D6A4F'},{bg:'#FFF3B0',txt:'#7B5E00'},{bg:'#E3EEF9',txt:'#1A3A5C'},{bg:'#FFE5E5',txt:'#8B1A1A'},{bg:'#FDE8D8',txt:'#7A3D1A'}];
const SESSION_KEY='selenior_session';
const SESSION_TTL=8*60*60*1000;

let mode=null, authHash=null, clients=[], reunioes=[], metas=[], objetivos=[], actionItems=[], documentos=[];
let activeFilter='todos', currentClientId=null, editingClientId=null, editingReuniaoId=null, editingMetaId=null;
