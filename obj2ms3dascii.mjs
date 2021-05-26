/**
 * Import an obj model and export as a ms3dascii model.
 * Ref : Need some help with Milkshape 3D ascii format - http://www.gamedev.net/topic/464065-need-some-help-with-milkshape-3d-ascii-format/
 * @param {string} obj The entire file of the obj
 * @param {string} mtl The entire file of the mtl
 */
export function obj2ms3dascii( obj, mtl ) {
  // -- read .obj ----------------------------------------------------------------------------------
  const vertices = {
    v: [],
    vt: [],
    vn: [],
  };

  let currentObject = null;
  const objects = [];

  let mtlPath = null;

  if ( obj == null ) {
    throw new Error( 'obj2ms3dascii: No obj file detected' );
  }

  obj.split( '\n' ).forEach( ( line ) => {
    const li = line.split( ' ' );

    if ( li[ 0 ] === 'mtllib' ) {
      mtlPath = li[ 1 ];
    } else if ( li[ 0 ] === 'o' ) {
      currentObject = {
        name: li[ 1 ],
        f: [],
      };
      objects.push( currentObject );
    } else if ( li[ 0 ] === 'v' ) {
      vertices.v.push( [ li[ 1 ], li[ 2 ], li[ 3 ] ] );
    } else if ( li[ 0 ] === 'vt' ) {
      vertices.vt.push( [ li[ 1 ], li[ 2 ] ] );
    } else if ( li[ 0 ] === 'vn' ) {
      vertices.vn.push( [ li[ 1 ], li[ 2 ], li[ 3 ] ] );
    } else if ( li[ 0 ] === 'f' ) {
      for ( let iLi = 3; iLi < li.length; iLi ++ ) {
        currentObject.f.push( [ li[ 1 ], li[ iLi - 1 ], li[ iLi ] ] );
      }
    } else if ( li[ 0 ] === 'usemtl' ) {
      currentObject.usemtl = li[ 1 ];
    }
  } );

  // -- read .mtl ----------------------------------------------------------------------------------
  // if ( mtlPath == null ) {
  //   throw new Error( 'obj2ms3dascii: mtllib not found' );
  // }

  let currentMaterial = {};
  const materials = [];

  mtl.split( '\n' ).forEach( ( line ) => {
    const li = line.split( ' ' );

    if ( li[ 0 ] === 'newmtl' ) {
      currentMaterial = {
        name: li[ 1 ],
        Ka: [ '0.000', '0.000', '0.000' ],
        Kd: [ '0.000', '0.000', '0.000' ],
        Ks: [ '0.000', '0.000', '0.000' ],
        Ke: [ '0.000', '0.000', '0.000' ],
        Ns: '0.000',
        d: '0.000',
        map_Kd: '',
        map_d: '',
      };
      materials.push( currentMaterial );
    } else if ( li[ 0 ] === 'Ka' ) {
      currentMaterial.Ka = [ li[ 1 ], li[ 2 ], li[ 3 ] ];
    } else if ( li[ 0 ] === 'Kd' ) {
      currentMaterial.Kd = [ li[ 1 ], li[ 2 ], li[ 3 ] ];
    } else if ( li[ 0 ] === 'Ks' ) {
      currentMaterial.Ks = [ li[ 1 ], li[ 2 ], li[ 3 ] ];
    } else if ( li[ 0 ] === 'Ke' ) {
      currentMaterial.Ke = [ li[ 1 ], li[ 2 ], li[ 3 ] ];
    } else if ( li[ 0 ] === 'Ns' ) {
      currentMaterial.Ns = li[ 1 ];
    } else if ( li[ 0 ] === 'd' ) {
      currentMaterial.d = li[ 1 ];
    } else if ( li[ 0 ] === 'map_Kd' ) {
      currentMaterial.map_Kd = li[ 1 ];
    } else if ( li[ 0 ] === 'map_d' ) {
      currentMaterial.map_d = li[ 1 ];
    }
  } );

  // -- check obj index usage ----------------------------------------------------------------------
  const firstFace = objects[ 0 ].f[ 0 ][ 0 ].split( '/' );
  const indexUsage = [
    firstFace[ 0 ] !== '', // v
    firstFace[ 1 ] !== '', // vt
    firstFace[ 2 ] !== '', // vn
  ];

  // -- obj v/vt to ms3dascii vertex ---------------------------------------------------------------
  vertices.ms = [];
  const vertexIndex = {};

  // attribute vertices with textureCoords
  objects.forEach( ( object ) => {
    object.f.forEach( ( face ) => {
      face.forEach( ( index ) => {
        if ( vertexIndex[ index ] == null ) {
          const ind = index.split( '/' ).map( ( char ) => parseInt( char ) - 1 );

          const xyz = vertices.v[ ind[ 0 ] ];
          const uv = indexUsage[ 1 ] ? vertices.vt[ ind[ 1 ] ] : [ 0.0, 0.0 ];

          vertices.ms.push( [
            xyz[ 0 ],
            xyz[ 1 ],
            xyz[ 2 ],
            uv[ 0 ],
            uv[ 1 ],
          ] );

          vertexIndex[ index ] = vertices.ms.length - 1;
        }
      } );
    } );
  } );

  // -- obj vn to ms3dascii normal -----------------------------------------------------------------
  vertices.msn = [];

  if ( indexUsage[ 2 ] ) {
    vertices.vn.forEach( ( normal ) => {
      vertices.msn.push( [ normal[ 0 ], normal[ 1 ], normal[ 2 ] ] );
    } );
  } else {
    // auto generate normals by face direction
    objects.forEach( ( object, iObject ) => {
      vertices.msn[ iObject ] = [];
      object.f.forEach( ( face ) => {
        const vf = face.map( ( facev ) => parseInt( facev.split( '/' )[ 0 ] ) );
        const v = vf.map( ( vfv ) => vertices.v[ vf[ vfv ] ] ).map( ( v ) => parseFloat( v ) );

        const a = [
          v[ 1 ][ 0 ] - v[ 0 ][ 0 ],
          v[ 1 ][ 1 ] - v[ 0 ][ 1 ],
          v[ 1 ][ 2 ] - v[ 0 ][ 2 ],
        ];
        const b = [
          v[ 2 ][ 0 ] - v[ 1 ][ 0 ],
          v[ 2 ][ 1 ] - v[ 1 ][ 1 ],
          v[ 2 ][ 2 ] - v[ 1 ][ 2 ],
        ];
        const n = [
          a[ 1 ] * b[ 2 ] - a[ 2 ] * b[ 1 ],
          a[ 2 ] * b[ 0 ] - a[ 0 ] * b[ 2 ],
          a[ 0 ] * b[ 1 ] - a[ 1 ] * b[ 0 ],
        ];
        const ln = -Math.sqrt( n[ 0 ] * n[ 0 ] + n[ 1 ] * n[ 1 ] + n[ 2 ] * n[ 2 ] ); // wtf is this minus
        const nn = n.map( ( v ) => v / ln );

        vertices.msn[ iObject ].push( nn );
      } );
    } );
  }

  // -- write ms3dascii ----------------------------------------------------------------------------
  let out = `// MilkShape 3D ASCII
// Converted from .obj with obj2ms3dascii.lua by FMS_Cat
// https://github.com/FMS-Cat/obj2ms3dascii
Frames: 30
Frame: 1
`;

  out += `Meshes: ${ objects.length }\n`;

  objects.forEach( ( object, iObject ) => {
    const materialIndex = materials.findIndex( ( material ) => material.name === object.usemtl );
    out += `"${ object.name }" 0 ${ materialIndex }\n`;

    out += `${ vertices.ms.length }\n`;
    vertices.ms.forEach( ( vertex ) => {
      out += `0 ${ vertex.join( ' ' ) } -1\n`;
    } );

    if ( indexUsage[ 2 ] ) {
      out += `${ vertices.msn.length }\n`;
      vertices.msn.forEach( ( normal ) => {
        out += `${ normal.join( ' ' ) }\n`;
      } );
    } else {
      out += `${ vertices.msn[ iObject ].length }\n`;
      vertices.msn[ iObject ].forEach( ( normal ) => {
        out += `${ normal.join( ' ' ) }\n`;
      } );
    }

    out += `${ object.f.length }\n`;
    if ( indexUsage[ 2 ] ) {
      object.f.forEach( ( face ) => {
        const fvs = face.map( ( f ) => f.split( '/' ).map( ( v ) => parseInt( v ) ) );
        out += `0 ${ face.map( ( f ) => vertexIndex[ f ] ).join( ' ' ) } ${ fvs.map( ( fv ) => fv[ 2 ] - 1 ).join( ' ' ) } 1\n`;
      } );
    } else {
      object.f.forEach( ( face, iFace ) => {
        out += `0 ${ face.map( ( f ) => vertexIndex[ f ] ).join( ' ' ) } ${ iFace } ${ iFace } ${ iFace } 1\n`;
      } );
    }
  } );

  out += `Materials: ${ materials.length }\n`;
  materials.forEach( ( material ) => {
    out += `"${ material.name }"
${ material.Ka.join( ' ' ) } 1.000000
${ material.Kd.join( ' ' ) } 1.000000
${ material.Ks.join( ' ' ) } 1.000000
${ material.Ke.join( ' ' ) } 1.000000
${ material.Ns }
${ material.d }
"${ material.map_Kd }"
"${ material.map_d }"
`;
  } );

  out += `Bones: 1
"Bone01"
""
0 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
1
1.000000 0.000000 0.000000 0.000000
1
1.000000 0.000000 0.000000 0.000000

GroupComments: 0
MaterialComments: 0
BoneComments: 0
ModelComment: 0`;

  return out;
}
