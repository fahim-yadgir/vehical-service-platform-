export type Role="customer"|"driver"|"mechanic"|"manager"|"owner"|"super_admin"|"support"|"finance";
export type BookingStatus="pending"|"driver_assigned"|"pickup_otp_verified"|"in_transit"|"at_centre"|"in_queue"|"inspection"|"job_card_created"|"waiting_approval"|"repair_in_progress"|"quality_check"|"invoice_generated"|"payment_pending"|"payment_completed"|"delivery_driver_assigned"|"delivery_otp_verified"|"completed"|"cancelled";
export interface Vehicle{id:string;brand:string;model:string;registration:string;type:string;year:number;health?:number;lastService?:string}
