import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assemblyBreadcrumb,
  assemblyCompositionMeshRequests,
  buildAssemblyMeshData,
  descendantLeafPartIds,
  findAssemblyNode,
  flattenAssemblyLeafParts
} from "./meshData.js";

test("buildAssemblyMeshData composes source meshes with assembly transforms", () => {
  const sourceMesh = {
    vertices: new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0
    ]),
    normals: new Float32Array([
      0, 0, 1,
      0, 0, 1,
      0, 0, 1
    ]),
    indices: new Uint32Array([0, 1, 2]),
    bounds: {
      min: [0, 0, 0],
      max: [1, 1, 0]
    }
  };
  const topology = {
    assembly: {
      root: {
        id: "root",
        nodeType: "assembly",
        children: [
          {
            id: "o1.2",
            occurrenceId: "o1.2",
            nodeType: "part",
            displayName: "sample_part",
            sourcePath: "parts/sample_part.step",
            worldTransform: [
              1, 0, 0, 10,
              0, 1, 0, 20,
              0, 0, 1, 30,
              0, 0, 0, 1
            ],
            children: []
          }
        ]
      }
    }
  };

  const meshData = buildAssemblyMeshData(
    topology,
    new Map([["parts/sample_part.step", sourceMesh]])
  );

  assert.deepEqual(Array.from(meshData.vertices), [
    10, 20, 30,
    11, 20, 30,
    10, 21, 30
  ]);
  assert.deepEqual(Array.from(meshData.indices), [0, 1, 2]);
  assert.equal(meshData.parts.length, 1);
  assert.equal(meshData.parts[0].id, "o1.2");
  assert.equal(meshData.parts[0].partSourcePath, "parts/sample_part.step");
  assert.deepEqual(meshData.parts[0].bounds, {
    min: [10, 20, 30],
    max: [11, 21, 30]
  });
});

test("assemblyCompositionMeshRequests supports native component meshes", () => {
  const topology = {
    assembly: {
      root: {
        id: "root",
        nodeType: "assembly",
        children: [
          {
            id: "o1.1",
            occurrenceId: "o1.1",
            nodeType: "part",
            assets: {
              glb: {
                url: "/models/imports/.assembly.step/components/o1.1.glb?v=abc",
                hash: "abc"
              }
            },
            children: []
          },
          {
            id: "o1.2",
            nodeType: "part",
            sourcePath: "parts/sample_part.step",
            children: []
          }
        ]
      }
    }
  };

  assert.deepEqual(assemblyCompositionMeshRequests(topology), [
    {
      key: "o1.1",
      sourcePath: "",
      meshUrl: "/models/imports/.assembly.step/components/o1.1.glb?v=abc"
    },
    {
      key: "parts/sample_part.step",
      sourcePath: "parts/sample_part.step",
      meshUrl: ""
    }
  ]);
});

test("buildAssemblyMeshData composes native component meshes by occurrence id", () => {
  const sourceMesh = {
    vertices: new Float32Array([
      0, 0, 0,
      2, 0, 0,
      0, 2, 0
    ]),
    normals: new Float32Array([
      0, 0, 1,
      0, 0, 1,
      0, 0, 1
    ]),
    indices: new Uint32Array([0, 1, 2]),
    bounds: {
      min: [0, 0, 0],
      max: [2, 2, 0]
    }
  };
  const topology = {
    assembly: {
      mode: "native",
      root: {
        id: "root",
        nodeType: "assembly",
        children: [
          {
            id: "o1.1",
            occurrenceId: "o1.1",
            nodeType: "part",
            displayName: "sample_component",
            worldTransform: [
              1, 0, 0, 3,
              0, 1, 0, 4,
              0, 0, 1, 5,
              0, 0, 0, 1
            ],
            children: []
          }
        ]
      }
    }
  };

  const meshData = buildAssemblyMeshData(
    topology,
    new Map([["o1.1", sourceMesh]])
  );

  assert.deepEqual(Array.from(meshData.vertices), [
    3, 4, 5,
    5, 4, 5,
    3, 6, 5
  ]);
  assert.equal(meshData.parts[0].partSourcePath, "");
  assert.equal(meshData.parts[0].label, "sample_component");
});

test("assembly helpers navigate nested assemblies down to leaf parts", () => {
  const root = {
    id: "root",
    nodeType: "assembly",
    displayName: "sample_root",
    children: [
      {
        id: "sample_module",
        nodeType: "assembly",
        displayName: "sample_module",
        children: [
          {
            id: "sample_part",
            nodeType: "part",
            displayName: "sample_part",
            children: []
          }
        ]
      }
    ]
  };

  assert.deepEqual(flattenAssemblyLeafParts(root).map((part) => part.id), ["sample_part"]);
  assert.equal(findAssemblyNode(root, "sample_module")?.displayName, "sample_module");
  assert.deepEqual(assemblyBreadcrumb(root, "sample_part").map((node) => node.id), ["root", "sample_module", "sample_part"]);
  assert.deepEqual(descendantLeafPartIds(root.children[0]), ["sample_part"]);
});
