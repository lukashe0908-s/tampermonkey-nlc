import { useEffect, useState } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { Button, Box, LinearProgress, Skeleton, TextField, Autocomplete } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { downloadFile, formatFileSize, fileConfig } from './util';
import lodash from 'lodash';

export function Download({
  fileList,
  title,
  downloadProgress,
  downloadCountCurrent,
  downloadCountTotal,
  downloadCountTotal_length,
  downloadCountTotalSelected,
  downloadFinished,
  downloadOptionSelected,
  setDownloadOptionSelected,
}: {
  downloadProgress: number[];
  downloadCountCurrent: number;
  downloadCountTotal: number;
  downloadCountTotalSelected: number;
  fileList: fileConfig[];
  title: string;
  downloadCountTotal_length: number;
  downloadFinished: boolean;
  downloadOptionSelected: number;
  setDownloadOptionSelected: Function;
}) {
  const downloadOption = [
    { label: '手动下载', value: 0 },
    { label: '自动下载', value: 1 },
    { label: '自动下载,不缓存', value: 2 },
  ];
  useEffect(() => {
    if (typeof GM_getValue === 'function' && GM_getValue('downloadOptionSelected')!)
      setDownloadOptionSelected(GM_getValue('downloadOptionSelected')!);
  }, []);
  return (
    <>
      <div className='flex items-center gap-4'>
        <div className='flex gap-[2px] w-full'>
          {downloadProgress.map((value: number, index: number) => {
            return (
              <LinearProgress
                color='primary'
                variant='determinate'
                value={value}
                key={index}
                className={`w-full first:!rounded-l-full last:!rounded-r-full`}
              ></LinearProgress>
            );
          })}
        </div>
        <div>
          {downloadCountCurrent}/{downloadCountTotalSelected}
        </div>
      </div>
      <div className='flex gap-4'>
        <Button
          variant='outlined'
          className='w-full !rounded-lg'
          onClick={() => {
            (async () => {
              for (let index = 0; index < fileList.length; index++) {
                const element = fileList[index];
                downloadFile(element.content, element.index, title, 'pdf', !(downloadCountTotal === 1), downloadCountTotal_length);
                await (async () => {
                  return new Promise(resolve => {
                    setTimeout(() => {
                      resolve(undefined);
                    }, 100);
                  });
                })();
              }
            })();
          }}
        >
          <FileDownloadIcon></FileDownloadIcon>
          全部下载到本地
        </Button>
        <Autocomplete
          disablePortal
          options={downloadOption}
          sx={{ width: 250 }}
          renderInput={params => <TextField {...params} label='下载选项' variant='standard' />}
          value={
            downloadOption[
              lodash.findKey(downloadOption, function (o: any) {
                return o.value === downloadOptionSelected;
              }) as unknown as number
            ]
          }
          onChange={(event: any, newValue: any) => {
            setDownloadOptionSelected(newValue.value);
            if (typeof GM_setValue === 'function') GM_setValue('downloadOptionSelected', newValue.value);
          }}
        />
      </div>

      <Box
        component='section'
        className={`!rounded-lg border-2 ${downloadFinished ? 'border-green-400' : 'border-yellow-400'} border-dashed transition-all`}
      >
        <VirtuosoGrid
          listClassName='flex flex-wrap'
          itemClassName='w-1/3 flex-none p-1'
          style={{ height: 300 }}
          totalCount={fileList.length}
          itemContent={index => {
            if (fileList[index])
              return (
                <Button
                  className='border-blue-400 cursor-pointer !rounded-lg w-full flex-col'
                  variant='outlined'
                  onClick={() => {
                    downloadFile(
                      fileList[index].content,
                      fileList[index].index,
                      title,
                      'pdf',
                      !(downloadCountTotal === 1),
                      downloadCountTotal_length
                    );
                  }}
                >
                  <div className='normal-case break-all'>{title}</div>
                  <div className='normal-case flex gap-1 text-white'>
                    <div className='px-1 rounded-md bg-blue-600'>
                      {(fileList[index].index + 1).toString().padStart(downloadCountTotal_length, '0')}
                    </div>
                    <div className='px-1 rounded-md bg-cyan-600'>{formatFileSize(fileList[index].size)}</div>
                  </div>
                </Button>
              );
          }}
        ></VirtuosoGrid>
      </Box>
    </>
  );
}
