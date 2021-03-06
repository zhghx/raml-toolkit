/*
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
"use strict";

import path from "path";

import { model, Raml10Parser } from "amf-client-js";
import { expect, default as chai } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";

import {
  getAllDataTypes,
  getApiName,
  parseRamlFile,
  resolveApiModel,
} from "./amfParser";

const validRamlFile = path.join(
  __dirname,
  "../../testResources/raml/site/site.raml"
);
const invalidRamlFile = path.join(
  __dirname,
  "../../testResources/raml/invalid/search-invalid.raml"
);

before(() => {
  chai.use(chaiAsPromised);
});

describe("Test RAML file", () => {
  it("Test invalid RAML file", () => {
    return expect(parseRamlFile(invalidRamlFile)).to.eventually.be.rejected;
  });

  it("Test valid RAML file", () => {
    return expect(parseRamlFile(validRamlFile)).to.eventually.not.be.empty;
  });

  it("re-throws AMF errors as actual errors", async () => {
    const stub = sinon.stub(Raml10Parser.prototype, "parseFileAsync");
    const fakeAmfError = {
      toString(): string {
        return "amf.fake.error: AMF doesn't like real Errors.";
      },
    };
    stub.rejects(fakeAmfError);

    // Can't do .rejectedWith because we want to check that the error message
    // matches exactly (not just a substring) and because we need to check the
    // `amfError` property
    const promise = parseRamlFile(invalidRamlFile);
    await expect(promise).to.be.rejected;
    const err = await promise.catch((e) => e);
    expect(err.message).to.equal("AMF doesn't like real Errors.");
    expect(err.amfError).to.equal(fakeAmfError);

    stub.restore();
  });

  it("re-throws regular errors unmodified", async () => {
    const stub = sinon.stub(Raml10Parser.prototype, "parseFileAsync");
    const fakeError = new ReferenceError("Beam me up, Scotty!");
    stub.rejects(fakeError);

    await expect(parseRamlFile(invalidRamlFile)).to.be.rejectedWith(fakeError);

    stub.restore();
  });
});

describe("Get Data types", () => {
  it("Test valid RAML file", async () => {
    const baseUnit = await parseRamlFile(validRamlFile);
    const dataTypes = getAllDataTypes(baseUnit);
    const dataTypeNames = dataTypes.map((entry) => entry.name.value());
    return expect(dataTypeNames).to.deep.equal([
      "product_search_result",
      "ClassA",
      "customer_product_list_item",
      "query",
      "ClassB",
      "search_request",
      "password_change_request",
      "sort",
      "result_page",
    ]);
  });

  it("Test valid RAML file with references", async () => {
    const refModel = await parseRamlFile(validRamlFile);
    const mainModel = await parseRamlFile(validRamlFile);
    mainModel.withReferences([refModel]);
    const dataTypes = getAllDataTypes(mainModel);
    const dataTypeNames = dataTypes.map((entry) => entry.name.value());
    return expect(dataTypeNames).to.deep.equal([
      "product_search_result",
      "ClassA",
      "customer_product_list_item",
      "query",
      "ClassB",
      "search_request",
      "password_change_request",
      "sort",
      "result_page",
    ]);
  });
});

describe("Test that API Name is returned in lower camelCase", () => {
  const expectedApiName = "shopperCustomers";

  const testGetApiName = (name: string): string => {
    const api = new model.domain.WebApi();
    api.withName(name);
    const doc = new model.document.Document();
    doc.withEncodes(api);
    return getApiName(doc);
  };

  it("returns lowerCamelCase with space in the name", () =>
    expect(testGetApiName("Shopper Customers")).to.equal(expectedApiName));

  it("returns lowerCamelCase with - in the name", () =>
    expect(testGetApiName("Shopper-Customers")).to.equal(expectedApiName));

  it("returns lowerCamelCase with _ in the name", () =>
    expect(testGetApiName("Shopper_Customers")).to.equal(expectedApiName));

  it("returns lowerCamelCase with . in the name", () =>
    expect(testGetApiName("shopper.customers")).to.equal(expectedApiName));

  it("returns lowerCamelCase with all lowercase name", () =>
    expect(testGetApiName("shopper customers")).to.equal(expectedApiName));

  it("returns lowerCamelCase with camelCase name", () =>
    expect(testGetApiName("shopperCustomers")).to.equal(expectedApiName));

  it("throws with null API name", () =>
    expect(() => testGetApiName(null)).to.throw(
      "Invalid name provided to normalize"
    ));

  it("throws with undefined API name", () =>
    expect(() => testGetApiName(undefined)).to.throw(
      "Invalid name provided to normalize"
    ));

  it("throws with empty API name", () =>
    expect(() => testGetApiName("")).to.throw(
      "Invalid name provided to normalize"
    ));
});

describe("Test resolving API model", () => {
  it("throws with null model", () =>
    expect(() => resolveApiModel(null, "editing")).to.throw(
      "Invalid API model provided to resolve"
    ));

  it("throws with undefined model", () =>
    expect(() => resolveApiModel(undefined, "editing")).to.throw(
      "Invalid API model provided to resolve"
    ));

  it("throws with null resolution pipeline", () => {
    const apiModel = new model.document.Document();
    return expect(() => resolveApiModel(apiModel, null)).to.throw(
      "Invalid resolution pipeline provided to resolve"
    );
  });

  it("throws with undefined resolution pipeline", () => {
    const apiModel = new model.document.Document();
    return expect(() => resolveApiModel(apiModel, undefined)).to.throw(
      "Invalid resolution pipeline provided to resolve"
    );
  });

  it("returns model with valid model and resolution pipeline", async () => {
    const testModel = await parseRamlFile(validRamlFile);
    const resolved = resolveApiModel(testModel, "editing");
    return expect(resolved).to.not.be.null;
  });
});
