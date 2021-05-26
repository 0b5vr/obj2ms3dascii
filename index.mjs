import * as fs from 'fs';
import { obj2ms3dascii } from './obj2ms3dascii.mjs';

const out = obj2ms3dascii(
  fs.readFileSync( process.argv[ 2 ], { encoding: 'utf-8' } ),
  fs.readFileSync( process.argv[ 3 ], { encoding: 'utf-8' } ),
);
fs.writeFileSync( process.argv[ 2 ] + '.txt', out );
