import { SerializeField } from '../src';
import { Model } from './model';
import { Scopes } from './types';

export class City extends Model {
  @SerializeField([{ scopes: [Scopes.FULL] }])
  name: string;

  constructor(dto: { id: number; name: string }) {
    super(dto);

    this.name = dto.name;
  }
}
