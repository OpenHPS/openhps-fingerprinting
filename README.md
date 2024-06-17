<h1 align="center">
  <img alt="OpenHPS" src="https://openhps.org/images/logo_text-512.png" width="40%" /><br />
  @openhps/fingerprinting
</h1>
<p align="center">
    <a href="https://github.com/OpenHPS/openhps-fingerprinting/actions/workflows/main.yml" target="_blank">
        <img alt="Build Status" src="https://github.com/OpenHPS/openhps-fingerprinting/actions/workflows/main.yml/badge.svg">
    </a>
    <a href="https://codecov.io/gh/OpenHPS/openhps-fingerprinting">
        <img src="https://codecov.io/gh/OpenHPS/openhps-fingerprinting/branch/master/graph/badge.svg"/>
    </a>
    <a href="https://codeclimate.com/github/OpenHPS/openhps-fingerprinting/" target="_blank">
        <img alt="Maintainability" src="https://img.shields.io/codeclimate/maintainability/OpenHPS/openhps-fingerprinting">
    </a>
    <a href="https://badge.fury.io/js/@openhps%2Ffingerprinting">
        <img src="https://badge.fury.io/js/@openhps%2Ffingerprinting.svg" alt="npm version" height="18">
    </a>
</p>

<h3 align="center">
    <a href="https://github.com/OpenHPS/openhps-core">@openhps/core</a> &mdash; <a href="https://openhps.org/docs/fingerprinting">API</a>
</h3>

<br />

This component provides nodes and services for positioning using fingerprinting. The following algorithms are supported:
- **k-NN**: With support for a custom distance/similarity function
- **Weighted k-NN**: With support for a custom weight function

## Getting Started
If you have [npm installed](https://www.npmjs.com/get-npm), start using @openhps/fingerprinting with the following command.
```bash
npm install @openhps/fingerprinting --save
```

## Usage
Offline fingerprinting works by storing a data objects relative positions. These relative positions can be
RSSI levels to Wireless Access Points, BLE beacons or even geometric information stored as ```RelativeValue```.

The fingerprinting service will pre process these fingerprints (merging, filling in missing values, ...) so they
can be used by online fingerprinting nodes. Fingerprinting services can be extended to perform more pre processing, such
as inter or extrapolation.

Depending on the fingerprinting algorithm, an online fingerprinting node such as the ```KNNFingerprintingNode``` will use the
stored and preprocessed fingerprints to reverse an objects relative positions to an absolute position.

```typescript
import { ModelBuilder, GraphBuilder } from '@openhps/core';
import { 
    FingerprintService,         // Pre processes fingerprints
    FingerprintingNode,         // Stores fingerprints
    KNNFingerprintingNode,      // Reverse fingerprinting
    WeightFunction,
    DistanceFunction
} from '@openhps/fingerprinting';

ModelBuilder.create()
    // Add a service with memory storage
    .addService(new FingerprintService(new MemoryDataService(Fingerprint), {
        defaultValue: -95,          // Default RSSI value
        autoUpdate: true            // Automatically preprocess fingerprints
    }))
    .addShape(GraphBuilder.create() // Offline stage
        .from(/* ... */)
        .via(new FingerprintingNode())
        .to(/* ... */))
    .addShape(GraphBuilder.create() // Online stage
        .from(/* ... */)
        .via(new KNNFingerprintingNode({
            k: 3,
            weighted: true,
            weightFunction: WeightFunction.SQUARE,
            similarityFunction: DistanceFunction.EUCLIDEAN
        }))
        .to(/* ... */)) // Output frame with applied position
    .build();
```

## Contributors
The framework is open source and is mainly developed by PhD Student Maxim Van de Wynckel as part of his research towards *Hybrid Positioning and Implicit Human-Computer Interaction* under the supervision of Prof. Dr. Beat Signer.

## Contributing
Use of OpenHPS, contributions and feedback is highly appreciated. Please read our [contributing guidelines](CONTRIBUTING.md) for more information.

## License
Copyright (C) 2019-2024 Maxim Van de Wynckel & Vrije Universiteit Brussel

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.