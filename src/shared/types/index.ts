export type Patient = {
  id: string;
  name: string;
  dob: string;
  gender: "Female" | "Male" | "Other";
  phone: string;
  email: string;
  address: string;
  notes: string;
  archived: number;
  createdAt: string;
};
export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  fee: number;
  availability: string[];
  startTime: string;
  endTime: string;
  status: "Active" | "Inactive";
  archived: number;
  createdAt: string;
};
export type Appointment = {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  reason: string;
  status: "Scheduled" | "Confirmed" | "Completed" | "Cancelled";
  createdAt: string;
};
export type Settings = {
  name: string;
  email: string;
  phone: string;
  address: string;
  timezone: string;
  openingTime: string;
  closingTime: string;
  openDays: string[];
};
export type Data = {
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  settings: Settings;
};
export type Entity = Patient | Doctor | Appointment;
export type Module = "patients" | "doctors" | "appointments";
