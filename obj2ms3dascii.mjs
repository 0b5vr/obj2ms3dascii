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
  const unfilteredObjects = []; // all found objects before being filtered to remove "invalid" objects

  // let mtlPath = null;

  if ( obj == null ) {
    throw new Error( 'obj2ms3dascii: No obj file detected' );
  }

  obj.split( '\n' ).forEach( ( line ) => {
    const li = line.split( ' ' );

    if ( li[ 0 ] === 'mtllib' ) {
      // mtlPath = li[ 1 ];
    } else if ( li[ 0 ] === 'o' || li[ 0 ] === 'g' ) {
      currentObject = {
        name: li[ 1 ],
        f: [],
      };
      unfilteredObjects.push( currentObject );
    } else if ( li[ 0 ] === 'v' ) {
      const vertex = [ li[ 1 ], li[ 2 ], li[ 3 ] ].map( ( v ) => parseFloat( v ) );
      vertices.v.push( vertex );
    } else if ( li[ 0 ] === 'vt' ) {
      const vertexUv = [ li[ 1 ], li[ 2 ] ].map( ( v ) => parseFloat( v ) );
      vertices.vt.push( vertexUv );
    } else if ( li[ 0 ] === 'vn' ) {
      const vertexNormal = [ li[ 1 ], li[ 2 ], li[ 3 ] ].map( ( v ) => parseFloat( v ) );
      vertices.vn.push( vertexNormal );
    } else if ( li[ 0 ] === 'f' ) {
      // `f 1//1 2//1 4//1 3//1`
      for ( let iLi = 3; iLi < li.length; iLi ++ ) {
        const face = [ li[ 1 ], li[ iLi - 1 ], li[ iLi ] ].map(
          ( i ) => i.split( '/' ).map( ( i ) => i !== '' ? parseInt( i ) : null )
        );
        currentObject.f.push( face );
      }
    } else if ( li[ 0 ] === 'usemtl' ) {
      currentObject.usemtl = li[ 1 ];
    }
  } );
  
  // Filter out "invalid" objects
  const objects = unfilteredObjects.filter( ( x ) => x.f.length > 0 );

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
        Ka: [ 0, 0, 0 ],
        Kd: [ 0, 0, 0 ],
        Ks: [ 0, 0, 0 ],
        Ke: [ 0, 0, 0 ],
        Ns: 0,
        d: 0,
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
  const firstIndices = objects[ 0 ].f[ 0 ][ 0 ];
  const indexUsage = [
    firstIndices[ 0 ] != null, // v
    firstIndices[ 1 ] != null, // vt
    firstIndices[ 2 ] != null, // vn
  ];

  // -- obj v/vt to ms3dascii vertex ---------------------------------------------------------------
  vertices.ms = [];
  const indexKeyMap = new Map();

  // attribute vertices with textureCoords
  objects.forEach( ( object ) => {
    object.f.forEach( ( face ) => {
      face.forEach( ( index ) => {
        const indexKey = index.join( '/' );
        if ( indexKeyMap[ indexKey ] == null ) {
          const xyz = vertices.v[ index[ 0 ] - 1 ];
          const uv = indexUsage[ 1 ] ? vertices.vt[ index[ 1 ] - 1 ] : [ 0.0, 0.0 ];

          vertices.ms.push( [
            xyz[ 0 ],
            xyz[ 1 ],
            xyz[ 2 ],
            uv[ 0 ],
            uv[ 1 ],
          ] );

          indexKeyMap[ indexKey ] = vertices.ms.length - 1;
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
        const v = face.map( ( i ) => vertices.v[ i[ 0 ] ] );

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
// Converted from .obj with obj2ms3dascii.lua by 0b5vr
// https://github.com/0b5vr/obj2ms3dascii
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
        out += `0 ${ face.map( ( index ) => indexKeyMap[ index.join( '/' ) ] ).join( ' ' ) } ${ face.map( ( index ) => index[ 2 ] - 1 ).join( ' ' ) } 1\n`;
      } );
    } else {
      object.f.forEach( ( face, iFace ) => {
        out += `0 ${ face.map( ( index ) => indexKeyMap[ index.join( '/' ) ] ).join( ' ' ) } ${ iFace } ${ iFace } ${ iFace } 1\n`;
      } );
    }
  } );

  out += `Materials: ${ materials.length }\n`;
  materials.forEach( ( material ) => {
    out += `"${ material.name }"
${ material.Ka.join( ' ' ) } 1
${ material.Kd.join( ' ' ) } 1
${ material.Ks.join( ' ' ) } 1
${ material.Ke.join( ' ' ) } 1
${ material.Ns }
${ material.d }
"${ material.map_Kd }"
"${ material.map_d }"
`;
  } );

  out += `Bones: 1
"Bone01"
""
0 0 0 0 0 0 0
1
1 0 0 0
1
1 0 0 0

GroupComments: 0
MaterialComments: 0
BoneComments: 0
ModelComment: 0`;

  return out;
}
