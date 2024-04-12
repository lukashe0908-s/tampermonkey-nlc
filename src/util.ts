export interface fileConfigTemple {
  url: string;
  token: string;
  content: any;
  size: number;
}
export interface fileConfig extends fileConfigTemple {
  index: number;
  content: Blob;
}
export interface fileConfigBlob extends fileConfigTemple {
  content: Blob;
}

export function downloadFile(content: Blob, index: number, title: string, fileExtra: string, useIndex: boolean = true, padTo: number = 4) {
  let object_ = URL.createObjectURL(content);
  const ele = document.createElement('a');
  ele.href = object_;
  ele.download = `${title}${useIndex ? '/' + index.toString().padStart(padTo, '0') : ''}.${fileExtra}`;
  ele.click();
  // window.URL.revokeObjectURL(object_);
}

export function formatFileSize(fileSize: number) {
  if (fileSize < 1024) {
    return fileSize + 'B';
  } else if (fileSize < 1024 * 1024) {
    let temp: any = fileSize / 1024;
    temp = temp.toFixed(2);
    return temp + 'KB';
  } else if (fileSize < 1024 * 1024 * 1024) {
    let temp: any = fileSize / (1024 * 1024);
    temp = temp.toFixed(2);
    return temp + 'MB';
  } else {
    let temp: any = fileSize / (1024 * 1024 * 1024);
    temp = temp.toFixed(2);
    return temp + 'GB';
  }
}
