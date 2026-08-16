-- A biblioteca original contém um GIF composto de aproximadamente 30 MB.
update storage.buckets
set file_size_limit = 52428800
where id = 'bt-exercicios';
