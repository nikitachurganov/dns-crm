import iphone17 from '../assets/demo/products/iphone-17.webp';
import dexpIet15wwc1 from '../assets/demo/products/dexp-iet15wwc-1.webp';
import appleWatchUltra3 from '../assets/demo/products/apple-watch-ultra-3.webp';
import keyronMagnetS25Fe from '../assets/demo/products/keyron-magnet-s25-fe.webp';
import galaxyS25Fe from '../assets/demo/products/galaxy-s25-fe.webp';
import keyronProtectIphone17 from '../assets/demo/products/keyron-protect-iphone-17.webp';
import tefalHb833132 from '../assets/demo/products/tefal-hb833132.jpg';
import redmondRmcM95 from '../assets/demo/products/redmond-rmc-m95.jpg';
import delonghiEcam22110 from '../assets/demo/products/delonghi-ecam-22110.jpg';
import boschTat3a114 from '../assets/demo/products/bosch-tat3a114.jpg';
import scarlettScKs57p19 from '../assets/demo/products/scarlett-sc-ks57p19.jpg';
import tefalBi520d10 from '../assets/demo/products/tefal-bi520d10.jpg';
import philipsDst3030 from '../assets/demo/products/philips-dst3030.jpg';
import msiRtx4070Ventus from '../assets/demo/products/msi-rtx-4070-ventus.jpg';
import bequietDarkPower12 from '../assets/demo/products/bequiet-dark-power-12-750.jpg';
import dysonV12s from '../assets/demo/products/dyson-v12s.jpg';
import atlantXm4024 from '../assets/demo/products/atlant-xm-4024.jpg';
import dexpBib420ama from '../assets/demo/products/dexp-bib420ama.jpg';
import galaxyA56 from '../assets/demo/products/galaxy-a56.jpg';
import lgF1296nds1 from '../assets/demo/products/lg-f1296nds1.jpg';
import asusVivobook16 from '../assets/demo/products/asus-vivobook-16.jpg';
import samsung990Evo from '../assets/demo/products/samsung-990-evo.jpg';
import samsungMs23k3513ak from '../assets/demo/products/samsung-ms23k3513ak.jpg';
import sonyWhCh520 from '../assets/demo/products/sony-wh-ch520.jpg';

/** Товар из каталога DNS для подстановки в детали заказа */
export interface Product {
	/** Название как на dns-shop.ru */
	name: string;
	/** Фото товара (500 px, с карточки на dns-shop.ru) */
	photo: string;
	/** Демо-цена, ₽: DNS не отдаёт цены без браузера, поэтому это не актуальная цена с сайта */
	price: number;
	/** Фрагменты названия из выгрузки заказов (нижний регистр), по которым товар подставляется в позицию */
	match: string[];
}

export const PRODUCTS: Product[] = [
	{
		name:  'Стиральная машина LG F1296NDS1 белый',
		photo: lgF1296nds1,
		price: 52990,
		match: ['lg f1296nds1', 'lg f2j5hs6w'],
	},
	{
		name:  '6.7" Смартфон Samsung Galaxy A56 128 ГБ серый',
		photo: galaxyA56,
		price: 34990,
		match: ['galaxy a56'],
	},
	{
		name:  'Беспроводные наушники Sony WH-CH520 черный 2023',
		photo: sonyWhCh520,
		price: 3990,
		match: ['wh-ch520'],
	},
	{
		name:  '1000 ГБ M.2 NVMe накопитель Samsung 990 EVO [MZ-V9E1T0BW]',
		photo: samsung990Evo,
		price: 7490,
		match: ['990 evo'],
	},
	{
		name:  '16" Ноутбук ASUS Vivobook 16 X1605VA-MB2104 серебристый',
		photo: asusVivobook16,
		price: 89990,
		match: ['vivobook 16'],
	},
	{
		name:  'Микроволновая печь Samsung MS23K3513AK черный',
		photo: samsungMs23k3513ak,
		price: 7490,
		match: ['ms23k3513ak'],
	},
	{
		name:  'Встраиваемый холодильник DEXP BIB420AMA',
		photo: dexpBib420ama,
		price: 31200,
		match: ['bib420ama'],
	},
	{
		name:  '6.3" Смартфон Apple iPhone 17 256 ГБ черный',
		photo: iphone17,
		price: 89990,
		match: ['смартфон apple iphone 17'],
	},
	{
		name:  'Беспроводное зарядное устройство DEXP IET15WWC-1 черный',
		photo: dexpIet15wwc1,
		price: 1990,
		match: ['iet15wwc-1'],
	},
	{
		name:  'Смарт-часы Apple Watch Ultra 3 49 mm',
		photo: appleWatchUltra3,
		price: 84990,
		match: ['watch ultra 3'],
	},
	{
		name:  'Накладка KEYRON Magnet Origin для Samsung Galaxy S25 FE прозрачный',
		photo: keyronMagnetS25Fe,
		price: 1490,
		match: ['keyron magnet origin'],
	},
	{
		name:  '6.7" Смартфон Samsung Galaxy S25 FE 256 ГБ черный',
		photo: galaxyS25Fe,
		price: 57990,
		match: ['смартфон samsung galaxy s25 fe'],
	},
	{
		name:  'Накладка KEYRON Protect для Apple iPhone 17 черный',
		photo: keyronProtectIphone17,
		price: 1490,
		match: ['keyron protect'],
	},
	{
		name:  'Блендер погружной Tefal Optitouch HB833132 белый',
		photo: tefalHb833132,
		price: 4990,
		match: ['hb833132'],
	},
	{
		name:  'Мультиварка Redmond RMC-M95 черный',
		photo: redmondRmcM95,
		price: 6990,
		match: ['rmc-m95'],
	},
	{
		name:  'Кофемашина автоматическая DeLonghi Magnifica S ECAM 22.110.SB серебристый',
		photo: delonghiEcam22110,
		price: 9990,
		match: ['ecam 22.110'],
	},
	{
		name:  'Тостер Bosch TAT3A114 красный',
		photo: boschTat3a114,
		price: 2490,
		match: ['tat3a114'],
	},
	{
		name:  'Кухонные весы Scarlett SC-KS57P19 коричневый',
		photo: scarlettScKs57p19,
		price: 2170,
		match: ['sc-ks57p19'],
	},
	{
		name:  'Электрочайник Tefal Equinox BI520D10 серебристый',
		photo: tefalBi520d10,
		price: 4450,
		match: ['bi520d10'],
	},
	{
		name:  'Утюг Philips DST3030/70 бирюзовый',
		photo: philipsDst3030,
		price: 4000,
		match: ['dst3030'],
	},
	{
		name:  'Видеокарта MSI GeForce RTX 4070 VENTUS 3X E OC [GeForce RTX 4070 VENTUS 3X E 12G OC]',
		photo: msiRtx4070Ventus,
		price: 62490,
		match: ['rtx 4070 ventus'],
	},
	{
		name:  'Блок питания be quiet! DARK POWER 12 750W [BN314] черный',
		photo: bequietDarkPower12,
		price: 9490,
		match: ['dark power 12 750w'],
	},
	{
		name:  'Вертикальный пылесос моющий Dyson V12s Detect Slim Submarine серый',
		photo: dysonV12s,
		price: 45990,
		match: ['dyson v12s'],
	},
	{
		name:  'Холодильник с морозильником ATLANT XM-4024-000 белый',
		photo: atlantXm4024,
		price: 38990,
		match: ['atlant xm-4024'],
	},
];

/**
 * Товар каталога по названию позиции из выгрузки заказов
 *
 * @param name Название позиции
 */
export function findProduct(name: string): Product | undefined {
	const lower = name.toLowerCase();

	return PRODUCTS.find((p) => p.match.some((m) => lower.includes(m)));
}
