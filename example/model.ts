import { SerializeField } from '../src';
import { Scopes } from './types';

export class Model {
  @SerializeField([{ scopes: [Scopes.BASE] }])
  id: number;

  constructor(dto: { id: number }) {
    this.id = dto.id;
  }
}
