document.addEventListener('DOMContentLoaded', () => {
  const progress = new Progress();
  progress.run();
  setTimeout(() => { document.body.classList.remove('inital'); }, 250);
});

class Progress {

  constructor() {
    this.share = new Share(this);

    this.weekDays = [];
    this.interval = -1;
    this.touchStart = null;

    this.dom = {}
    // this.dom.time = document.querySelector('.time')
    this.dom.serviceProgress = document.querySelector('.stats .stat.service-progress .content');
    this.dom.totalProgress = document.querySelector('.stats .stat.total-progress .content');
    this.dom.dayProgress = document.querySelector('.stats .stat.day-progress .content');
    this.dom.progressBar = document.querySelector('.progress-bar');

    this.dom.daysRemaining = document.querySelector('.stats .stat.days-remaining .content');
    this.dom.hoursRemaining = document.querySelector('.stats .stat.hours-remaining .content');
    this.dom.minutesRemaining = document.querySelector('.stats .stat.minutes-remaining .content');
    this.dom.secondsRemaining = document.querySelector('.stats .stat.seconds-remaining .content');
    this.dom.secondsRemainingStat = document.querySelector('.stats .stat.seconds-remaining');

    this.dom.input = {};

    this.dom.input.start = document.querySelector('input#service-start');
    this.dom.input.end = document.querySelector('input#service-end');

    this.dom.input.holidayStartDay = document.querySelector('select#holiday-start-day');
    this.dom.input.holidayStartTime = document.querySelector('input#holiday-start-time');

    this.dom.input.holidayEndDay = document.querySelector('select#holiday-end-day');
    this.dom.input.holidayEndTime = document.querySelector('input#holiday-end-time');

    this.dom.action = {}
    this.dom.action.reset = document.querySelector('a#reset');
    this.dom.action.showSeconds = document.querySelector('a#showSeconds');

    this.startDate = null;
    this.endDate = null;

    this.setup();
    this.init();

    Select.setup(document.body);
  }

  isReady() {
    return this.startDate && this.endDate && this.startDate < this.endDate;
  }

  setup() {
    [this.dom.input.holidayStartDay, this.dom.input.holidayEndDay].forEach(select => {
      [1, 2, 3, 4, 5, 6, 0].forEach(dayIndex => {
        const option = document.createElement('option');
        option.value = dayIndex;
        option.innerText = WeekDay.LONG[dayIndex];
        select.appendChild(option);
      })
    });

    // Holiday Start
    this.dom.input.holidayStartDay.addEventListener('change', e => {
      this.holidayStartDay = parseInt(this.dom.input.holidayStartDay.value);
      localStorage.setItem('holiday-start-day', this.holidayStartDay);
      this.run();
    });

    this.dom.input.holidayStartTime.addEventListener('change', e => {
      this.holidayStartTime = parseTime(this.dom.input.holidayStartTime.value);
      this.dom.input.holidayStartTime.value = timeToString(this.holidayStartTime);
      localStorage.setItem('holiday-start-time', this.dom.input.holidayStartTime.value);
      this.run();
    });

    // Holiday End
    this.dom.input.holidayEndDay.addEventListener('change', e => {
      this.holidayEndDay = parseInt(this.dom.input.holidayEndDay.value);
      localStorage.setItem('holiday-end-day', this.holidayEndDay);
      this.run();
    });

    this.dom.input.holidayEndTime.addEventListener('change', e => {
      this.holidayEndTime = parseTime(this.dom.input.holidayEndTime.value);
      this.dom.input.holidayEndTime.value = timeToString(this.holidayEndTime);
      localStorage.setItem('holiday-end-time', this.dom.input.holidayEndTime.value);
      this.run();
    });

    ['change', 'blur'].forEach(event => {
      // Service Start
      this.dom.input.start.addEventListener(event, e => {
        if(!Date.parse(this.dom.input.start.value)) return;
        this.startDate = new Date(this.dom.input.start.value);
        localStorage.setItem('service-start', this.startDate.getTime());
        this.dom.input.start.classList.remove('missing');
        this.run();
      });

      // Service End
      this.dom.input.end.addEventListener(event, e => {
        if(!Date.parse(this.dom.input.end.value)) return;
        this.endDate = new Date(this.dom.input.end.value);
        localStorage.setItem('service-end', this.endDate.getTime());
        this.dom.input.end.classList.remove('missing');
        this.run();
      });
    });

    // Progress Bar
    this.dom.progressBar.addEventListener('mouseleave', () => {
      if (!this.isReady()) return;
      this.startAutoUpdate();
    });

    this.dom.progressBar.addEventListener('touchstart', e => {
      if (e.touches.length == 0) return;
      this.touchStart = Date.now();
    });

    this.dom.progressBar.addEventListener('touchmove', (e) => {
      if (e.touches.length == 0) return;
      if (Date.now() - this.touchStart < 500) return;

      const weekDayIndex = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY)?.closest('.day')?.getAttribute('data-week-day-index');
      if(!weekDayIndex) return;

      const weekDay = this.weekDays[parseInt(weekDayIndex)];
      if(!weekDay) return;

      e.preventDefault();
      e.stopPropagation();
      weekDay.setProgressForCoordinates(e.touches[0].clientX, e.touches[0].clientY);
    });

    this.dom.progressBar.addEventListener('touchend', e => {
      if (!this.isReady()) return;
      this.touchStart = null;
      this.startAutoUpdate();
    });

    // Reset
    this.dom.action.reset.addEventListener('click', () => {
      this.reset();
      this.run();
    });

    // Show Seconds
    this.dom.action.showSeconds.addEventListener('click', () => {
      this.showSeconds = !this.showSeconds;
      this.dom.action.showSeconds.innerText = this.showSeconds ? 'Hide seconds' : 'Show seconds';
      this.dom.secondsRemainingStat.style.display = this.showSeconds ? 'block' : 'none';
      localStorage.setItem('show-seconds', this.showSeconds);
    })
  }

  init() {
    // Service Start
    const serviceStart = parseInt(localStorage.getItem('service-start'));
    this.startDate = serviceStart ? new Date(serviceStart) : null;

    if (this.startDate) {
      this.dom.input.start.value = dateToString(this.startDate);
    } else {
      const date = new Date().getFirstDayOfWeek();
      date.setHours(9, 30, 0, 0);
      this.dom.input.start.value = dateToString(date);
      this.dom.input.start.classList.add('missing');
    }

    // Service End
    const serviceEnd = parseInt(localStorage.getItem('service-end'));
    this.endDate = serviceEnd ? new Date(serviceEnd) : null;

    if (this.endDate) {
      this.dom.input.end.value = dateToString(this.endDate);
    } else {
      const date = new Date().getLastDayOfWeek(3);
      date.setDate(date.getDate() - 2); // 2 days before end of week
      date.setHours(16, 0, 0, 0);
      this.dom.input.end.value = dateToString(date);
      this.dom.input.end.classList.add('missing');
    }


    // Holiday Start
    this.holidayStartDay = parseInt(localStorage.getItem('holiday-start-day') ?? 5);
    this.dom.input.holidayStartDay.value = this.holidayStartDay

    this.holidayStartTime = parseTime(localStorage.getItem('holiday-start-time') ?? '18:00:00');
    this.dom.input.holidayStartTime.value = timeToString(this.holidayStartTime);

    // Holiday End
    this.holidayEndDay = parseInt(localStorage.getItem('holiday-end-day') ?? 0);
    this.dom.input.holidayEndDay.value = this.holidayEndDay;

    this.holidayEndTime = parseTime(localStorage.getItem('holiday-end-time') ?? '23:30:00');
    this.dom.input.holidayEndTime.value = timeToString(this.holidayEndTime);

    // Show seconds
    this.showSeconds = localStorage.getItem('show-seconds', this.showSeconds) ?? false;
    this.dom.action.showSeconds.innerText = this.showSeconds ? 'Hide seconds' : 'Show seconds';
    this.dom.secondsRemainingStat.style.display = this.showSeconds ? 'block' : 'none';
  }

  run() {
    document.body.classList.toggle('prepare', !this.isReady());
    this.setupWeekDays();
    this.startAutoUpdate();
    this.update();
  }

  setupWeekDays() {
    this.weekDays = [];

    if(!this.isReady()) return;

    this.dom.progressBar.innerHTML = '';

    const currentDate = this.startDate.getFirstDayOfWeek().getPreviousWeek().getBeginningOfDay();
    const lastDate = this.endDate.getLastDayOfWeek().getNextWeek().getBeginningOfDay();

    let weekElement = null;

    while(currentDate <= lastDate) {
      if(currentDate.getDay() === 1) {
        if (weekElement !== null) this.dom.progressBar.appendChild(weekElement);
        weekElement = document.createElement('div');
        weekElement.classList.add('week');

        const endOfWeek = currentDate.getLastDayOfWeek().withLocalTime(23,59,59,999);
        const startOfWeek = currentDate.getFirstDayOfWeek().withLocalTime(0,0,0,0);
        weekElement.classList.toggle('extra', endOfWeek < this.startDate || this.endDate < startOfWeek);
      }

      const weekDay = new WeekDay(this, this.weekDays.length, new Date(currentDate))
      this.weekDays.push(weekDay);
      weekElement.appendChild(weekDay.getDom());

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (weekElement !== null) this.dom.progressBar.appendChild(weekElement);
  }

  update(dateNow) {
    if(!this.isReady()) return;

    dateNow = dateNow ?? new Date();

    const weekDay = WeekDay.SHORT[dateNow.getDay()];
    const date = `${dbldig(dateNow.getDate())}.${dbldig(dateNow.getMonth() + 1)}.${dateNow.getFullYear()}`;
    const time = `${dbldig(dateNow.getHours())}:${dbldig(dateNow.getMinutes())}`;
    //this.dom.time.innerText = `${weekDay} ${date} ${time}`;

    this.weekDays.forEach(weekday => { weekday.update(dateNow); });

    this.dom.serviceProgress.innerText = `${this.getServiceProgress(dateNow).toFixed(3)}%`;

    this.dom.totalProgress.innerText = `${this.getTotalProgress(dateNow).toFixed(3)}%`;

    this.dom.dayProgress.innerText = `${this.getPassedDays(dateNow)}/${this.getTotalDays(dateNow)}`;

    const remaining = this.getRemaining(dateNow);
    this.dom.daysRemaining.innerText = `${remaining.days}d`;
    this.dom.hoursRemaining.innerText = `${remaining.hours}h`;
    this.dom.minutesRemaining.innerText = `${remaining.minutes}m`;
    this.dom.secondsRemaining.innerText = `${remaining.seconds}s`;
  }

  getTotalProgress(dateNow) {
    if (this.getDuration() == 0) return 0;
    return 100 * Math.min(1, Math.max(0, (dateNow - this.startDate) / this.getDuration()));
  }

  getServiceProgress(dateNow) {
    let serviceDuration = 0;
    let servicePassed = 0;

    this.weekDays.forEach(weekday => {
      serviceDuration += weekday.getServiceDuration();
      servicePassed += weekday.getServicePassed(dateNow);
    });

    if (serviceDuration == 0) return 0;
    return 100 * servicePassed / serviceDuration;
  }

  getPassedDays(dateNow) {
    return this.weekDays.filter(weekday => {
      if (weekday.getServiceDuration() / weekday.getDuration() < 0.25) return false;
      if (weekday.getServiceEnd() > dateNow) return false;
      return true;
    }).length;
  }

  getTotalDays() {
    return this.weekDays.filter(weekday => {
      if (weekday.getServiceDuration() / weekday.getDuration() < 0.25) return false;
      return true;
    }).length;
  }

  getRemaining(dateNow) {
    let time = Math.ceil(Math.max(0, this.endDate.getTime() - Math.max(this.startDate.getTime(), dateNow.getTime())) / 1000);
    const remaining = {};

    remaining.days = Math.floor(time / (24 * 60 * 60));
    time = time % (24 * 60 * 60);

    remaining.hours = Math.floor(time / (60 * 60));
    time = time % (60 * 60);

    remaining.minutes = Math.floor(time / 60);
    time = time % 60;

    remaining.seconds = Math.floor(time);

    return remaining;
  }

  getDuration() {
    return this.endDate - this.startDate;
  }

  reset() {
    localStorage.removeItem('service-start');
    localStorage.removeItem('service-end');

    localStorage.removeItem('holiday-start-day');
    localStorage.removeItem('holiday-start-time');

    localStorage.removeItem('holiday-end-day');
    localStorage.removeItem('holiday-end-time');

    localStorage.removeItem('show-seconds');

    setTimeout(() => {
      this.dom.progressBar.innerHTML = '';
    }, 500);

    this.init();
  }

  startAutoUpdate() {
    this.stopAutoUpdate();
    this.interval = setInterval(() => { this.update() }, 1000);
    this.update();
  }

  stopAutoUpdate() {
    clearInterval(this.interval);
  }
}

class WeekDay {

  static SHORT =  ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  static LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  constructor(progress, index, date) {
    this.progress = progress;
    this.index = index;
    this.startDate = date.getBeginningOfDay();
    this.endDate = date.getEndOfDay();

    this.serviceStart = null;
    this.serviceEnd = null;

    this.dom = {}
    this.dom.root = null;
  }

  getDom() {
    if(this.dom.root) return this.dom.root;

    this.dom.root = document.createElement('div');
    this.dom.root.classList.add('day');
    this.dom.root.setAttribute('data-week-day-index', this.index);
    this.dom.root.innerHTML = `
      <span class="date"></span>
      <span class="progress"></span>
      <span class="service"></span>
      <span class="time dawn"></span>
      <span class="time noon"></span>
      <span class="time dusk"></span>
    `

    this.dom.text = this.dom.root.querySelector('.date');
    this.dom.progress = this.dom.root.querySelector('.progress');
    this.dom.service = this.dom.root.querySelector('.service');

    this.dom.text.innerHTML = '';
    this.dom.text.innerHTML += `${WeekDay.SHORT[this.startDate.getDay()]}<span class="break"> </span>`
    this.dom.text.innerHTML += `${dbldig(this.startDate.getDate())}.${dbldig(this.startDate.getMonth() + 1)}.`;

    this.dom.service.style.left = `${100 * (this.getServiceStart().getTime() - this.startDate.getTime()) / this.getDuration()}%`
    this.dom.service.style.right = `${100 * (this.endDate.getTime() - this.getServiceEnd().getTime()) / this.getDuration()}%`

    this.dom.root.addEventListener('mousemove', e => this.setProgressForCoordinates(e.clientX, e.clientY));

    return this.dom.root;
  }

  setProgressForCoordinates(x, y) {
    const element = this.dom.root.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (x - element.x) / element.width));

    const dateAtCoordinates = new Date(this.startDate.getTime() + this.getDuration() * progress);

    this.progress.stopAutoUpdate();
    this.progress.update(dateAtCoordinates);
  }

  getDuration() {
    return this.endDate.getTime() - this.startDate.getTime();
  }

  getProgress(dateNow) {
    return Math.min(1, Math.max(0, (dateNow.getTime() - this.startDate.getTime()) / this.getDuration()))
  }

  getServiceDuration() {
    return this.getServiceEnd().getTime() - this.getServiceStart().getTime();
  }

  getServicePassed(dateNow) {
    if (dateNow < this.getServiceStart()) {
      return 0;
    } else if (this.getServiceEnd() < dateNow) {
      return this.getServiceDuration();
    } else {
      return dateNow.getTime() - this.getServiceStart().getTime();
    }
  }

  getServiceStart() {
    if (this.serviceStart) return this.serviceStart;

    if (this.startDate < this.progress.startDate.getBeginningOfDay() || this.progress.endDate.getEndOfDay() < this.startDate) {
      // Outside of service
      this.serviceStart = this.startDate;
    } else if (this.startDate.getTime() == this.progress.startDate.getBeginningOfDay().getTime()){
      // First Day
      this.serviceStart = this.progress.startDate;
    } else if (this.startDate.getDay() == this.progress.holidayEndDay) {
      // Holiday End
      this.serviceStart = this.startDate.withLocalTime(...this.progress.holidayEndTime);
    } else {
      this.serviceStart = this.startDate;
    }

    return this.serviceStart;
  }

  getServiceEnd() {
    if (this.serviceEnd) return this.serviceEnd;

    if (this.startDate < this.progress.startDate.getBeginningOfDay() || this.progress.endDate.getEndOfDay() < this.startDate) {
      // Outside of service
      this.serviceEnd = this.startDate;
    } else if (isDayBetween(this.startDate.getDay(), this.progress.holidayStartDay, this.progress.holidayEndDay)) {
      // Holiday
      this.serviceEnd = this.startDate;
    } else if (this.startDate.getTime() == this.progress.endDate.getBeginningOfDay().getTime()){
      // Last day
      this.serviceEnd = this.progress.endDate;
    } else if (this.startDate.getDay() == this.progress.holidayStartDay) {
      // Holiday Start
      this.serviceEnd = this.startDate.withLocalTime(...this.progress.holidayStartTime);
    } else {
      this.serviceEnd = this.endDate;
    }

    return this.serviceEnd;
  }

  update(dateNow) {
    this.dom.root.classList.toggle('passed', this.endDate < dateNow);
    this.dom.root.classList.toggle('upcoming', dateNow < this.startDate);
    this.dom.progress.style.width = `${100 * this.getProgress(dateNow)}%`;
  }
}

class Share {
  constructor(progress) {
    this.progress = progress;

    this.dom = {}
    this.dom.canvas = document.createElement("canvas");
    this.dom.canvas.width = 1080;
    this.dom.canvas.height = 1080;

    this.dom.button = document.querySelector('.share');

    this.dom.dialog = document.querySelector('dialog');
    this.dom.img = this.dom.dialog.querySelector('img');
    this.dom.close = this.dom.dialog.querySelector('.close');

    this.ctx = this.dom.canvas.getContext("2d");

    this.dom.button.addEventListener('click', this.share.bind(this, null));
    this.dom.close.addEventListener('click', this.closeDialog.bind(this, null));
  }

  async share() {
    if(!this.progress.isReady()) return;

    const blob = await (await fetch(this.getDataUrl())).blob();
    const file = new File([blob], 'share.png', { type: 'image/png' });

    const data = { files: [file], text: 'Check out the progress of the service.' };

    if(navigator.share && navigator.canShare(data)) return navigator.share(data);

    return this.openDiaog();
  }

  openDiaog() {
    this.dom.img.src = this.getDataUrl();
    this.dom.dialog.setAttribute('open', '');
  }

  closeDialog() {
    this.dom.dialog.removeAttribute('open');
  }

  getDataUrl() {
    const dateNow = new Date();

    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, 1080, 1080);

    // brown
    this.ctx.fillStyle = "#5e3828";
    this.ctx.beginPath();
    this.ctx.moveTo(1080, 980);
    this.ctx.lineTo(1080, 830);
    this.ctx.lineTo(580, 980);
    this.ctx.closePath();
    this.ctx.fill();

    // beige
    this.ctx.fillStyle = "#ad8851";
    this.ctx.beginPath();
    this.ctx.moveTo(1080, 980);
    this.ctx.lineTo(1080, 380);
    this.ctx.lineTo(930, 980);
    this.ctx.closePath();
    this.ctx.fill();

    // green
    this.ctx.fillStyle = "#324714";
    this.ctx.beginPath();
    this.ctx.moveTo(1080, 980);
    this.ctx.lineTo(1080, 700);
    this.ctx.lineTo(800, 980);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = "#222";
    this.ctx.fillRect(0, 980, 1080, 1080);

    this.ctx.fillStyle = '#c33';
    this.ctx.font = "bold 30px Arial";
    this.ctx.fillText("Is it over yet?",50,1040);

    this.ctx.font = "30px Arial";
    this.ctx.fillStyle = '#aaa';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(window.location.host + (window.location.pathname !== '/' ? window.location.pathname : ''),1030,1040);
    this.ctx.textAlign = 'left';

    // Progress
    this.ctx.font = "30px Arial";
    this.ctx.fillStyle = '#aaa';
    this.ctx.fillText("Progress",50,70);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = "bold 400px Arial";
    this.ctx.fillText(`${Math.floor(this.progress.getTotalProgress(dateNow))}%`,50,410);

    // Days
    this.ctx.font = "30px Arial";
    this.ctx.fillStyle = '#aaa';
    this.ctx.fillText("Days",50,520);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = "bold 120px Arial";
    this.ctx.fillText(`${this.progress.getPassedDays(dateNow)} / ${this.progress.getTotalDays(dateNow)}`,50,650);

    // Remaining
    this.ctx.font = "30px Arial";
    this.ctx.fillStyle = '#aaa';
    this.ctx.fillText("Remaining",50,770);

    const remaining = this.progress.getRemaining(dateNow);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = "bold 120px Arial";
    this.ctx.fillText(`${remaining.days}d ${remaining.hours}h ${remaining.minutes}m`,50,900);

    return this.dom.canvas.toDataURL("image/png");
  }
}

class Select {
  constructor(select) {
    this.dom = {};

    this.dom.root = document.createElement('div');
    this.dom.root.classList.add('select');

    this.dom.preview = document.createElement('span');
    this.dom.preview.classList.add('preview');

    this.dom.select = select;

    this.dom.select.parentNode.insertBefore(this.dom.root, this.dom.select);
    this.dom.root.appendChild(this.dom.select);
    this.dom.root.appendChild(this.dom.preview);

    this.dom.select.addEventListener('change', this.update.bind(this, null));

    this.update();
  }

  update() {
    const value = this.dom.select.value ?? '';
    const text = this.dom.select.querySelector(`option[value='${value}']`).innerText ?? '...'
    this.dom.preview.innerText = text;
  }

  static setup(root) {
    Array.from(root.querySelectorAll('select')).forEach(select => {
      new Select(select);
    });
  }
}

function dbldig(n) {
  return ('00' + n).slice(-2);
}

function parseTime(str) {
  return str.split(':').slice(0, 2).map(v => parseInt(v));
}

function timeToString(t) {
  return `${dbldig(t[0])}:${dbldig(t[1])}`
}

function dateToString(d) {
  const date = `${d.getFullYear()}-${dbldig(d.getMonth() + 1)}-${dbldig(d.getDate())}`;
  const time = `${dbldig(d.getHours())}:${dbldig(d.getMinutes())}:${dbldig(d.getSeconds())}`
  return `${date}T${time}`
}

function isDayBetween(day, start, end) {
  day = day % 7;
  start = start % 7;
  end = end % 7;

  if (start <= end) {
    return start < day && day < end;
  } else {
    return (start < day && day <= 6) || (0 <= day && day < end);
  }
}

Date.prototype.getBeginningOfDay = function() {
  return this.withLocalTime(0, 0, 0, 0);
}

Date.prototype.getEndOfDay = function() {
  return this.withLocalTime(23, 59, 59, 999);
}

Date.prototype.getFirstDayOfWeek = function() {
  const d = new Date(this);
  d.setDate(d.getDate() - (d.getDay() || 7) + 1);
  return d;
}

Date.prototype.getLastDayOfWeek = function(weeks) {
  weeks = weeks ?? 1;
  const d = new Date(this);
  d.setDate(d.getDate() - (d.getDay() || 7) + 7 * weeks)
  return d;
}

Date.prototype.getPreviousWeek = function(weeks) {
  weeks = weeks ?? 1;
  const d = new Date(this);
  d.setDate(d.getDate() - 7 * weeks)
  return d;
}

Date.prototype.getNextWeek = function(weeks) {
  weeks = weeks ?? 1;
  const d = new Date(this);
  d.setDate(d.getDate() + 7 * weeks)
  return d;
}

Date.prototype.withLocalTime = function(...args) {
  const d = new Date(this);
  d.setHours(...args);
  return d;
}

Date.prototype.toUTC = function() {
  const d = new Date(this);
  d.setTime(d.getTime() - d.getTimezoneOffset() * 60 * 1000);
  return d;
}