import dayjs from 'dayjs';

// นำเข้า Plugin ที่คนนิยมใช้บ่อยๆ
import 'dayjs/locale/th'; // โหลด locale ภาษาไทย
import relativeTime from 'dayjs/plugin/relativeTime'; // ใช้สำหรับ '2 ชั่วโมงที่แล้ว' (time from now)
import timezone from 'dayjs/plugin/timezone'; // การจัดการด้าน Timezone
import utc from 'dayjs/plugin/utc'; // แปลงเวลามาตรฐาน
import customParseFormat from 'dayjs/plugin/customParseFormat'; // ป้องกันบัคตอน parse string

// ติดตั้ง Plugins เสริมให้ Day.js
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

// กำหนดให้ทุกครั้งที่เรียกใช้ ถือว่าเป็นภาษาไทยเป็นค่าเริ่มต้น
dayjs.locale('th');
// ตั้งเวลาให้เป็น Timezone ของไทย
dayjs.tz.setDefault('Asia/Bangkok');

// สร้าง Type เพื่อให้ TypeScript เข้าใจ Plugin
declare module 'dayjs' {}

/**
 * ตัวอย่างการนำไปใช้:
 * 
 * import dayjs from '@/lib/dayjs';
 * 
 * const now = dayjs().format('DD/MM/YYYY HH:mm'); // 26/03/2026 17:20
 * const ago = dayjs('2026-03-25').fromNow(); // "1 วันที่แล้ว"
 */

export default dayjs;
