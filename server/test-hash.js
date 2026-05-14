const bcrypt = require('bcryptjs');
const pass = 'adinathmade33';
const hash = '$2a$10$1LADfgd8HQ0allD5lnGLb.dVxH.sVVCt07WYykl48x0vryQ1fCgLO';
console.log('Compare:', bcrypt.compareSync(pass, hash));
