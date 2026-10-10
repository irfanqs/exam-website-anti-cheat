-- Satu identitas peserta (NIM/NIS/email) hanya boleh punya satu sesi per ujian.
-- Sesi lama tanpa participantRef (NULL) tidak terpengaruh karena NULL dianggap berbeda.
CREATE UNIQUE INDEX "ExamSession_examId_participantRef_key" ON "ExamSession"("examId", "participantRef");
