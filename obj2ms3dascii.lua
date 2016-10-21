-- Ref : Need some help with Milkshape 3D ascii format - http://www.gamedev.net/topic/464065-need-some-help-with-milkshape-3d-ascii-format/

----------------

-- Ref : Luaで文字列の分割を行なう(split) - http://symfoware.blog68.fc2.com/blog-entry-455.html
function split( _str, _sep )
	if string.find( _str, _sep ) == nil then
		return { _str }
	end

	local ret = {}
	local pat = "(.-)" .. _sep .. "()"
	local lastPos
	for part, pos in string.gmatch( _str, pat ) do
		table.insert( ret, part )
		lastPos = pos
	end
	table.insert( ret, string.sub( _str, lastPos ) )
	return ret
end

-----------------

-- load .obj
objPath = arg[1]
if objPath == nil then
	print( "This script needs .obj file!\nUsage : > obj2ms3dascii.lua cube.obj\n" )
	os.exit()
else
	objFile = io.open( objPath, "r" )
	if objFile == nil then
		print( "not found : " .. objPath )
		os.exit()
	end
end

vertices = {}
vertices["v"] = {}
vertices["vt"] = {}
vertices["vn"] = {}
objects = {}
currentObject = 0
mtlPath = nil

-- read .obj
for line in objFile:lines() do
	li = split( line, " " )
	if li[1] == "mtllib" then
		mtlPath = li[2]
	elseif li[1] == "o" then
		currentObject = currentObject + 1
		objects[currentObject] = {}
		objects[currentObject]["name"] = li[2]
		objects[currentObject]["f"] = {}
	elseif li[1] == "v" then table.insert( vertices["v"], { li[2], li[3], li[4] } )
	elseif li[1] == "vt" then table.insert( vertices["vt"], { li[2], li[3] } )
	elseif li[1] == "vn" then table.insert( vertices["vn"], { li[2], li[3], li[4] } )
	elseif li[1] == "f" then
		for iLi = 4, #li do
			table.insert( objects[currentObject]["f"], { li[2], li[iLi-1], li[iLi] } )
		end
	elseif li[1] == "usemtl" then objects[currentObject]["usemtl"] = li[2]
	end
end
objFile:close()

--------------------------

-- load .mtl
if mtlPath == nil then
	print( "mtllib not found" )
	os.exit()
else
	mtlFile = io.open( mtlPath, "r" )
	if mtlFile == nil then
		print( "not found : " .. mtlPath )
		os.exit()
	end
end

materials = {}
currentMaterial = 0

-- read .mtl
for line in mtlFile:lines() do
	li = split( line, " " )
	if li[1] == "newmtl" then
		currentMaterial = currentMaterial + 1
		materials[currentMaterial] = {}
		materials[currentMaterial]["name"] = li[2]
		materials[currentMaterial]["Ka"] = { "0.000", "0.000", "0.000" }
		materials[currentMaterial]["Kd"] = { "0.000", "0.000", "0.000" }
		materials[currentMaterial]["Ks"] = { "0.000", "0.000", "0.000" }
		materials[currentMaterial]["Ke"] = { "0.000", "0.000", "0.000" }
		materials[currentMaterial]["Ns"] = "0.000"
		materials[currentMaterial]["d"] = "0.000"
		materials[currentMaterial]["map_Kd"] = ""
		materials[currentMaterial]["map_d"] = ""
	elseif li[1] == "Ka" then materials[currentMaterial]["Ka"] = { li[2], li[3], li[4] }
	elseif li[1] == "Kd" then materials[currentMaterial]["Kd"] = { li[2], li[3], li[4] }
	elseif li[1] == "Ks" then materials[currentMaterial]["Ks"] = { li[2], li[3], li[4] }
	elseif li[1] == "Ke" then materials[currentMaterial]["Ke"] = { li[2], li[3], li[4] }
	elseif li[1] == "Ns" then materials[currentMaterial]["Ns"] = li[2]
	elseif li[1] == "d" then materials[currentMaterial]["d"] = li[2]
	elseif li[1] == "map_Kd" then materials[currentMaterial]["map_Kd"] = li[2]
	elseif li[1] == "map_d" then materials[currentMaterial]["map_d"] = li[2]
	end
end
mtlFile:close()

-------------------

-- check obj index usage
indexUsage = {}
indexUsage[1] = not not tonumber( split( objects[1]["f"][1][1], "/" )[1] ) -- v
indexUsage[2] = not not tonumber( split( objects[1]["f"][1][1], "/" )[2] ) -- vt
indexUsage[3] = not not tonumber( split( objects[1]["f"][1][1], "/" )[3] ) -- vn

-------------------

-- obj v/vt to ms3dascii vertex
vertices["ms"] = {}
vertexIndex = {}

-- attribute vertices with textureCoods
for iObject, vObject in ipairs( objects ) do
	for iFace, vFace in ipairs( vObject["f"] ) do
		for iIndex, vIndex in ipairs( vFace ) do
			if not vertexIndex[vIndex] then
				ind = split( vIndex, "/" )
				if indexUsage[2] then
					table.insert( vertices["ms"], { vertices["v"][tonumber(ind[1])][1], vertices["v"][tonumber(ind[1])][2], vertices["v"][tonumber(ind[1])][3], vertices["vt"][tonumber(ind[2])][1], vertices["vt"][tonumber(ind[2])][2] } ) -- x, y, z, u, v
				else
					table.insert( vertices["ms"], { vertices["v"][tonumber(ind[1])][1], vertices["v"][tonumber(ind[1])][2], vertices["v"][tonumber(ind[1])][3], 0.0, 0.0 } ) -- x, y, z, u, v
				end
				vertexIndex[vIndex] = #vertices["ms"]
			end
		end
	end
end

-- obj vn to ms3dascii normal
vertices["msn"] = {}

if indexUsage[3] then
	for iNormal, vNormal in ipairs( vertices["vn"] ) do
		table.insert( vertices["msn"], { vNormal[1], vNormal[2], vNormal[3] } )
	end
else
	for iObject, vObject in ipairs( objects ) do
		vertices["msn"][iObject] = {}
		for iFace, vFace in ipairs( vObject["f"] ) do
			-- cross product, compute normal
			vf = {}
			vf[1] = split( vFace[1], "/" )[1]
			vf[2] = split( vFace[2], "/" )[1]
			vf[3] = split( vFace[3], "/" )[1]
			a = { vertices["v"][tonumber(vf[2])][1]-vertices["v"][tonumber(vf[1])][1], vertices["v"][tonumber(vf[2])][2]-vertices["v"][tonumber(vf[1])][2], vertices["v"][tonumber(vf[2])][3]-vertices["v"][tonumber(vf[1])][3] }
			b = { vertices["v"][tonumber(vf[3])][1]-vertices["v"][tonumber(vf[2])][1], vertices["v"][tonumber(vf[3])][2]-vertices["v"][tonumber(vf[2])][2], vertices["v"][tonumber(vf[3])][3]-vertices["v"][tonumber(vf[2])][3] }
			n = { a[2]*b[3] - a[3]*b[2], a[3]*b[1] - a[1]*b[3], a[1]*b[2] - a[2]*b[1] }
			nLength = -math.sqrt( n[1]*n[1] + n[2]*n[2] + n[3]*n[3] )
			n = { n[1]/nLength, n[2]/nLength, n[3]/nLength }
			table.insert( vertices["msn"][iObject], n )
		end
	end
end

-------------------

-- write ms3dascii
out = [[// MilkShape 3D ASCII
// Converted from .obj with obj2ms3dascii.lua by FMS_Cat
// https://github.com/FMS-Cat/obj2ms3dascii
Frames: 30
Frame: 1
]]

out = out .. string.format( "Meshes: %d\n", #objects )
for iObject, vObject in ipairs( objects ) do

	for iMaterial, vMaterial in ipairs( materials ) do
		if vObject["usemtl"] == vMaterial["name"] then
			materialIndex = iMaterial-1
			break
		end
	end
	out = out .. string.format( "\"%s\" 0 %d\n", vObject["name"], materialIndex )

	out = out .. string.format( "%d\n", #vertices["ms"] )
	for iVertex, vVertex in ipairs( vertices["ms"] ) do
		out = out .. string.format( "0 %f %f %f %f %f -1\n", vVertex[1], vVertex[2], vVertex[3], vVertex[4], vVertex[5] );
	end

	if indexUsage[3] then
		out = out .. string.format( "%d\n", #vertices["msn"] )
		for iNormal, vNormal in ipairs( vertices["msn"] ) do
			out = out .. string.format( "%f %f %f\n", vNormal[1], vNormal[2], vNormal[3] );
		end
	else
		out = out .. string.format( "%d\n", #vertices["msn"][iObject] )
		for iNormal, vNormal in ipairs( vertices["msn"][iObject] ) do
			out = out .. string.format( "%f %f %f\n", vNormal[1], vNormal[2], vNormal[3] )
		end
	end

	out = out .. string.format( "%d\n", #vObject["f"] )
	if indexUsage[3] then
		for iFace, vFace in ipairs( vObject["f"] ) do
			ind = {}
			ind[1] = split( vFace[1], "/" )
			ind[2] = split( vFace[2], "/" )
			ind[3] = split( vFace[3], "/" )
			out = out .. string.format( "0 %d %d %d %d %d %d 1\n", vertexIndex[vFace[1]]-1, vertexIndex[vFace[2]]-1, vertexIndex[vFace[3]]-1, ind[1][3]-1, ind[2][3]-1, ind[3][3]-1 );
		end
	else
		for iFace, vFace in ipairs( vObject["f"] ) do
			ind = {}
			ind[1] = split( vFace[1], "/" )
			ind[2] = split( vFace[2], "/" )
			ind[3] = split( vFace[3], "/" )
			out = out .. string.format( "0 %d %d %d %d %d %d 1\n", vertexIndex[vFace[1]]-1, vertexIndex[vFace[2]]-1, vertexIndex[vFace[3]]-1, iFace-1, iFace-1, iFace-1 );
		end
	end
end

out = out .. string.format( "Materials: %d\n", #materials )
for iMaterial, vMaterial in ipairs( materials ) do
	out = out .. string.format( "\"%s\"\n", vMaterial["name"] )
	out = out .. string.format( "%f %f %f 1.000000\n", vMaterial["Ka"][1], vMaterial["Ka"][2], vMaterial["Ka"][3] )
	out = out .. string.format( "%f %f %f 1.000000\n", vMaterial["Kd"][1], vMaterial["Kd"][2], vMaterial["Kd"][3] )
	out = out .. string.format( "%f %f %f 1.000000\n", vMaterial["Ks"][1], vMaterial["Ks"][2], vMaterial["Ks"][3] )
	out = out .. string.format( "%f %f %f 1.000000\n", vMaterial["Ke"][1], vMaterial["Ke"][2], vMaterial["Ke"][3] )
	out = out .. string.format( "%f\n", vMaterial["Ns"] )
	out = out .. string.format( "%f\n", vMaterial["d"] )
	out = out .. string.format( "\"%s\"\n", vMaterial["map_Kd"] )
	out = out .. string.format( "\"%s\"\n", vMaterial["map_d"] )
end

out = out .. [[Bones: 1
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
ModelComment: 0]]
outFile = io.open( objPath .. ".txt", "w" )
outFile:write( out )
outFile:close();
