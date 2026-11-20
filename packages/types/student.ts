import type { Specialty } from './index';
export const studyStatuses = ['PENDING', 'TAKING', 'REGULAR', 'APPROVED'] as const;
export type StudyStatus = typeof studyStatuses[number];
export const studyStatusLabels: Record<StudyStatus, string> = { PENDING: 'Pendiente', TAKING: 'Cursando', REGULAR: 'Regularizada', APPROVED: 'Aprobada' };
export interface StudyRule { regular: string[]; approved: string[]; notes: string[] }
export interface StudyRequirements { enroll: StudyRule; exam: StudyRule }
export interface StudyCourse { id: string; code: string; name: string; year: number; kind: 'SUBJECT' | 'ELECTIVE' | 'PRACTICE' | 'OPTIONAL'; notes: string; requirements: StudyRequirements; status: StudyStatus; updatedAt: string | null }
export interface StudyPlanInfo { id: string; specialty: Specialty; version: string; name: string; sourceUrl: string; verifiedAt: string; notes: string }
export interface StudentPath { specialty: Specialty | null; plans: StudyPlanInfo[]; plan: (StudyPlanInfo & { courses: StudyCourse[] }) | null }
export function unmetRequirements(rule: StudyRule, statuses: Record<string, StudyStatus>) {
  return { regular: rule.regular.filter(code => !['REGULAR', 'APPROVED'].includes(statuses[code] ?? 'PENDING')), approved: rule.approved.filter(code => statuses[code] !== 'APPROVED'), notes: rule.notes };
}
export function ruleSatisfied(rule: StudyRule, statuses: Record<string, StudyStatus>) {
  const missing = unmetRequirements(rule, statuses);
  return !missing.regular.length && !missing.approved.length && !missing.notes.length;
}
