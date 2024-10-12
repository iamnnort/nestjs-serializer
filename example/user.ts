import { SerializeField, SerializeRelation } from '../src';
import { City } from './city';
import { Model } from './model';
import { Scopes } from './types';

export class User extends Model {
  @SerializeField([{ scopes: [Scopes.FULL] }])
  name: string;

  @SerializeRelation([{ scopes: [Scopes.FULL], relationScopes: [Scopes.BASE, Scopes.FULL] }])
  city: City;

  constructor(dto: { id: number; name: string; city: City }) {
    super(dto);

    this.name = dto.name;
    this.city = dto.city;
  }
}
