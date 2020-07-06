/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ApiGroup } from "./apiGroup";

/**
 * A collection of multiple groups of APIs stored by key.
 */
export class ApiCollection {
  [key: string]: ApiGroup;

  /**
   * Loads an entire collection of APIs from a simple description format.
   *
   * @param description - a simple object literal with group names as
   * properties and a list of file paths under each group
   */
  static async read(description: {
    [key: string]: string[];
  }): Promise<ApiCollection> {
    const apiCollection = new ApiCollection();
    for (const group in description) {
      apiCollection[group] = await ApiGroup.read(description[group]);
      apiCollection[group].setName(group);
    }
    return apiCollection;
  }
}