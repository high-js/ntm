import {cloneDeep} from 'lodash';
import deepFreeze from 'deep-freeze';
import {createClientError} from '@resdir/error';

import ValueResource from './value';

export class ArrayResource extends ValueResource {
  static '$RESOURCE_TYPE' = 'array';

  static '$RESOURCE_NATIVE_CHILDREN' = {
    '@countItems': {
      '@type': 'method',
      '@description': 'Return the number of items in the array'
    }
  };

  static '$normalizeValue'(value) {
    if (!Array.isArray(value)) {
      throw createClientError('Invalid value type');
    }
    value = cloneDeep(value);
    deepFreeze(value);
    return value;
  }

  static '$normalize'(definition, options) {
    if (Array.isArray(definition)) {
      definition = {'@value': definition};
    }
    return super.$normalize(definition, options);
  }

  static '$parseValue'(str) {
    return str ? [str] : [];
  }

  async '@countItems'() {
    return {
      result: this.$value ? this.$value.length : 0
    };
  }
}

export default ArrayResource;
