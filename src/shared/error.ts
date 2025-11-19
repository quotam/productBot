export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundInCatalog extends UserError {
  constructor(article: string) {
    super(`Артикул "${article}" не найден в справочнике`);
  }
}

export class NoCodesFoundError extends UserError {
  constructor() {
    super("В файле не найдено кодов в столбце B");
  }
}

export class CatalogLoadingError extends UserError {
  constructor(cause: string) {
    super(`Ошибка загрузки справочника: ${cause}`);
  }
}
