// Code goes here!
// types ________________________________________________________________________________
interface InputElements {
  [prop: string]: HTMLInputElement;
}

interface Validatable {
  value: string | number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

interface Draggable {
  dragStartHandler(e: Event): void;
  dragEndHandler(e: Event): void;
}

interface DragTarget {
  dragOverHandler(e: Event): void;
  dropHandler(e: Event): void;
  dragLeaveHandler(e: Event): void;
}

enum ProjectStatus {
  Active,
  Finished,
}

type ListenerFunction = (projects: Project[]) => void;

// decorators ________________________________________________________________________________
function validate(options: Validatable): boolean {
  let isValid = true;
  if (options.required)
    isValid = isValid && options.value.toString().trim().length > 0;
  if (typeof options.value === "string") {
    if (options.minLength && options.minLength !== null)
      isValid = isValid && options.value.length > options.minLength;
    if (options.maxLength && options.maxLength !== null)
      isValid = isValid && options.value.length <= options.maxLength;
  }
  if (typeof options.value === "number") {
    if (options.min && options.min !== null)
      isValid = isValid && options.value > options.min;
    if (options.max && options.max !== null)
      isValid = isValid && options.value <= options.max;
  }
  return isValid;
}

function AutoBind(_: any, _2: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  const adjDescriptor: PropertyDescriptor = {
    configurable: true,
    get() {
      const boundedM = method.bind(this);
      return boundedM;
    },
  };
  return adjDescriptor;
}

// state ________________________________________________________________________________
class ProjectsState {
  private _projects: Project[] = [];
  private _listeners: Function[] = [];

  private static instance: ProjectsState;

  private constructor() {}

  static getInstance() {
    if (this.instance) return this.instance;
    this.instance = new ProjectsState();
    return this.instance;
  }

  setNewListener(f: Function) {
    this._listeners.push(f);
  }

  setNewProject(...args: [string, string, number]) {
    const [title, description, people] = args;
    const newProject = new Project(
      title,
      description,
      people,
      ProjectStatus.Active
    );
    this._projects.push(newProject);
    this._updateListeners();
  }

  moveProject(id: string, newStatus: ProjectStatus) {
    const prj = this._projects.find((p) => p.id === id);
    if (!(prj && (prj.status !== newStatus))) return;
    prj.status = newStatus;
    this._updateListeners();
  }

  private _updateListeners() {
    this._listeners.forEach((f) => f(this._projects));
  }
}
const state = ProjectsState.getInstance();

// classes ________________________________________________________________________________

// component ______________________________
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
  private _templateEl: HTMLTemplateElement;
  private _hostElement: T;
  _element: U;
  private _insertPlace: InsertPosition;

  constructor(
    tempId: string,
    hostId: string,
    insertPlace: InsertPosition,
    newElId?: string
  ) {
    this._templateEl = document.getElementById(tempId)! as HTMLTemplateElement;
    this._hostElement = document.getElementById(hostId)! as T;
    this._insertPlace = insertPlace;
    this._element = document.importNode(this._templateEl.content, true)
      .firstElementChild! as U;
    newElId && (this._element.id = newElId);
    this._attach();
  }

  private _attach() {
    this._hostElement.insertAdjacentElement(this._insertPlace, this._element);
  }

  abstract configure(): void;
  abstract renderContent(): void;
}

// project Item ______________________________
class ProjectItem
  extends Component<HTMLUListElement, HTMLLIElement>
  implements Draggable
{
  private _project: Project;

  constructor(hostId: string, project: Project) {
    super("single-project", hostId, "beforeend", project.id);
    this._project = project;
    this.configure();
    this.renderContent();
  }

  @AutoBind
  dragStartHandler(e: DragEvent) {
    e.dataTransfer!.setData("text/plain", this._project.id);
    e.dataTransfer!.effectAllowed = "move";
  }

  dragEndHandler(e: DragEvent) {
    console.log(e);
  }

  configure() {
    this._element.addEventListener("dragstart", this.dragStartHandler);
    this._element.addEventListener("dragend", this.dragEndHandler);
  }
  renderContent() {
    this._element.querySelector("h5")!.innerText = this._project.title;
    this._element.querySelector("h6")!.innerText = this._project.people + "";
    this._element.querySelector("p")!.innerText = this._project.description;
  }
}

// project ______________________________
class Project {
  id = (Math.random() * 100).toString();
  constructor(
    public title: string,
    public description: string,
    public people: number,
    public status: ProjectStatus
  ) {}
}

// list ______________________________
class ProjectList
  extends Component<HTMLDivElement, HTMLElement>
  implements DragTarget
{
  private _assignedProjects: Project[];
  private _type: "active" | "finished";

  constructor(type: "active" | "finished") {
    super("project-list", "app", "beforeend", `${type}-projects`);
    this._type = type;
    this._assignedProjects = [];

    this.configure();
    this.renderContent();
  }

  configure() {
    state.setNewListener((projects: Project[]) => {
      this._assignedProjects = projects.filter((prj) =>
        this._type === "active"
          ? prj.status === ProjectStatus.Active
          : prj.status === ProjectStatus.Finished
      );
      this._renderProjectItems();

      this._element.addEventListener("dragover", this.dragOverHandler);
      this._element.addEventListener("dragend", this.dragLeaveHandler);
      this._element.addEventListener("drop", this.dropHandler);
    });
  }

  @AutoBind
  dragOverHandler(e: DragEvent) {
    if (!(e.dataTransfer && e.dataTransfer.types[0] === "text/plain")) return;
    e.preventDefault();
    document
      .querySelectorAll("ul")!
      .forEach((ul) => (ul.style.minHeight = "200px"));
  }

  @AutoBind
  dropHandler(e: DragEvent) {
    const prjId = e.dataTransfer!.getData("text/plain");
    state.moveProject(
      prjId,
      this._type === "active" ? ProjectStatus.Active : ProjectStatus.Finished
    );
  }

  @AutoBind
  dragLeaveHandler(e: Event) {
    document
      .querySelectorAll("ul")!
      .forEach((ul) => (ul.style.minHeight = "0 !important"));
  }

  private _renderProjectItems() {
    const ulEl = this._element.querySelector(
      `#${this._type}-projects-list`
    )! as HTMLUListElement;
    ulEl.innerHTML = "";

    this._assignedProjects.forEach((prj) => {
      new ProjectItem(ulEl.id, prj);
    });
  }

  renderContent() {
    const listId = `${this._type}-projects-list`;
    this._element.querySelector("ul")!.id = listId;
    this._element.querySelector(
      "h2"
    )!.innerText = `${this._type.toUpperCase()} PROJECTS`;
  }
}

// form ______________________________
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
  private _inputs: InputElements;

  constructor() {
    super("project-input", "app", "afterbegin");

    const inputs: InputElements = {};
    ["title", "description", "people"].forEach(
      (id: string) => (inputs[id] = this._element.querySelector(`#${id}`)!)
    );
    this._inputs = inputs;
    this.configure();
  }

  private _getInputValues(): [string, string, number] | boolean[] {
    const { _inputs: inputs } = this;
    const [enteredTitle, enteredDescription, enteredPeople] = [
      inputs.title.value,
      inputs.description.value,
      inputs.people.value,
    ];
    const [
      isEnteredTitleValid,
      isEnteredDescriptionValid,
      isEnteredPeopleValid,
    ] = [
      validate({
        value: enteredTitle,
        required: true,
        minLength: 4,
        maxLength: 12,
      }),
      validate({
        value: enteredDescription,
        required: true,
        minLength: 30,
        maxLength: 320,
      }),
      validate({
        value: +enteredPeople,
        required: true,
        min: 1,
        max: 7,
      }),
    ];

    return [
      isEnteredTitleValid,
      isEnteredDescriptionValid,
      isEnteredPeopleValid,
    ].some((el) => el === false)
      ? [isEnteredTitleValid, isEnteredDescriptionValid, isEnteredPeopleValid]
      : [enteredTitle, enteredDescription, +enteredPeople];
  }

  private _clearInputs() {
    Object.values(this._inputs).forEach((input) => (input.value = ""));
  }

  @AutoBind
  private _submitHandler(e: Event) {
    e.preventDefault();
    const values = this._getInputValues();
    if (values.some((el) => el === false))
      return alert("Please select a value");

    state.setNewProject(...(values as [string, string, number]));
    this._clearInputs();
  }

  configure() {
    this._element.addEventListener("submit", this._submitHandler);
  }

  renderContent() {}
}

new ProjectInput();
new ProjectList("active");
new ProjectList("finished");
