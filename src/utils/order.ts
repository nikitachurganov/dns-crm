import type {Order} from '../types';
import {findProduct} from '../data/products';
import {datePart} from './format';

/** Позиция заказа */
export interface OrderLine {
	name: string;
	/** Фото товара; пустое, если товара нет в каталоге */
	photo: string;
	qty: number;
	/** Цена позиции; пустая, если в выгрузке её нет */
	price: string;
}

/** Способ и место получения */
export interface OrderDelivery {
	/** «Доставка» или «Самовывоз» */
	method: string;
	/** «Адрес» или «Филиал» */
	label: string;
	value: string;
	isPickup: boolean;
}

/** Статусы, после которых заказ уже нельзя менять или отменять */
const FINAL_STATUSES = ['получен', 'доставлен', 'отменён', 'возврат оформлен', 'обмен оформлен'];

/**
 * Состав заказа. Цены берутся из колонки prices; без неё цена известна только у заказа из одного товара
 *
 * @param order Заказ
 */
export function orderLines(order: Order): OrderLine[] {
	const names  = order.items.split(',').map((n) => n.trim()).filter(Boolean);
	const prices = (order.prices ?? '').split(';').map((p) => p.trim());

	return names.map((name, i) => {
		const product = findProduct(name);

		return {
			name:  product?.name ?? name.charAt(0).toUpperCase() + name.slice(1),
			photo: product?.photo ?? '',
			qty:   1,
			price: prices[i] || (1 === names.length ? order.amount : ''),
		};
	});
}

/**
 * Способ и адрес получения из «Самовывоз · ТЦ Бира Сити» / «Доставка курьером».
 * Самовывоз — филиал, доставка — полный адрес (если его нет в выгрузке — город клиента)
 *
 * @param order Заказ
 * @param city Город клиента
 */
export function orderDelivery(order: Order, city = ''): OrderDelivery {
	const [method = '', place = ''] = order.delivery.split('·').map((p) => p.trim());
	const isPickup = /самовывоз|постамат/i.test(method);

	return {
		method: isPickup ? 'Самовывоз' : 'Доставка',
		label:  isPickup ? 'Филиал' : 'Адрес',
		value:  (isPickup ? place : (order.address || city)) || '—',
		isPickup,
	};
}

/** Оплата: по данным выгрузки отдельного статуса нет, считаем оплаченным всё, кроме «ожидает оплаты» */
export function orderPayment(order: Order): string {
	return 'ожидает оплаты' === order.status ? 'Ожидает оплаты' : 'Оплачен';
}

/** Трекинг для тега: у проблемного заказа клиент уже получил товар, поэтому «получен» */
export function orderTracking(order: Order): string {
	return 'проблема' === order.status ? 'получен' : order.status;
}

/** Можно ли ещё менять заказ: перенос доставки и отмена недоступны после получения, отмены и возврата */
export function isOrderOpen(order: Order): boolean {
	return !FINAL_STATUSES.includes(order.status);
}

/** «18.04.26» */
export function shortDate(date: string): string {
	const d = datePart(date);

	return `${d.slice(0, 5)}.${d.slice(8)}`;
}

/** «1 позиция» / «2 позиции» / «5 позиций» */
export function positionsWord(n: number): string {
	const mod10  = n % 10;
	const mod100 = n % 100;

	if (1 === mod10 && 11 !== mod100) {
		return `${n} позиция`;
	}

	return 2 <= mod10 && 4 >= mod10 && !(12 <= mod100 && 14 >= mod100) ? `${n} позиции` : `${n} позиций`;
}
